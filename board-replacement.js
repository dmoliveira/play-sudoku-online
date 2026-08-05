(function () {
  const VALID_KINDS = new Set(["replace", "restart"]);

  function cleanLabel(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function install(options) {
    const root = options?.root || document;
    const dialog = options?.dialog;
    const title = options?.title;
    const description = options?.description;
    const keepButton = options?.keepButton;
    const confirmButton = options?.confirmButton;
    const adapter = options?.adapter;
    if (!root || !dialog || !title || !description || !keepButton || !confirmButton || !adapter) {
      throw new Error("BoardReplacementGuard requires a complete dialog and adapter");
    }

    const bypass = new WeakSet();
    let pending = null;

    function isActive() {
      return Boolean(pending && dialog.open);
    }

    function restoreTimer(decision) {
      if (!decision?.timerWasRunning || adapter.isTimerRunning() || !adapter.canResumeTimer()) return;
      adapter.resumeTimer();
    }

    function clearDialogState() {
      pending = null;
      document.documentElement.classList.remove("discard-dialog-open");
    }

    function cancelDecision() {
      const decision = pending;
      if (!decision) return;
      if (dialog.open) dialog.close("keep");
      try {
        adapter.cancelDecision?.(decision.kind, decision.trigger);
      } catch {
        // Cancellation cleanup must never strand the shared dialog or timer.
      }
      clearDialogState();
      restoreTimer(decision);
      window.requestAnimationFrame(() => {
        if (decision.trigger?.isConnected) decision.trigger.focus({ preventScroll: true });
      });
    }

    function confirmDecision() {
      const decision = pending;
      if (!decision) return;
      if (dialog.open) dialog.close("confirm");
      clearDialogState();
      const trigger = decision.trigger;
      if (trigger?.isConnected) {
        bypass.add(trigger);
        try {
          trigger.click();
        } finally {
          bypass.delete(trigger);
        }
      } else {
        try {
          adapter.cancelDecision?.(decision.kind, trigger);
        } catch {
          // A detached trigger cannot consume route-local preparation.
        }
      }
      window.requestAnimationFrame(() => {
        const unchanged = adapter.getBoardIdentity() === decision.boardIdentity;
        if (unchanged) {
          restoreTimer(decision);
          if (!adapter.isTimerRunning() && trigger?.isConnected) trigger.focus({ preventScroll: true });
        }
      });
    }

    function openDecision(trigger, kind) {
      const destination = cleanLabel(trigger.textContent || trigger.getAttribute("aria-label")) || (kind === "restart" ? "Restart board" : "Replace board");
      const timerWasRunning = adapter.isTimerRunning();
      const boardIdentity = adapter.getBoardIdentity();
      pending = { trigger, kind, timerWasRunning, boardIdentity };
      if (timerWasRunning) adapter.suspendTimer();
      const restarting = kind === "restart";
      title.textContent = restarting ? "Restart this board?" : "Replace this board?";
      const lossSummary = "entries, notes, elapsed time, mistakes, and solver-aid history";
      const abandonmentSummary = adapter.recordsAbandonmentOnReplace
        ? " This run will be recorded as abandoned."
        : "";
      description.textContent = restarting
        ? `Restarting clears your ${lossSummary} for this board. Completed results stay intact.`
        : `Starting “${destination}” discards your ${lossSummary} for this board.${abandonmentSummary} Completed results stay intact.`;
      confirmButton.textContent = restarting ? "Restart board" : "Replace board";
      document.documentElement.classList.add("discard-dialog-open");
      dialog.showModal();
      window.requestAnimationFrame(() => keepButton.focus({ preventScroll: true }));
    }

    function captureDiscard(event) {
      const trigger = event.target?.closest?.("[data-discard-kind]");
      if (!trigger || !root.contains(trigger) || bypass.has(trigger)) return;
      const kind = trigger.dataset.discardKind;
      if (!VALID_KINDS.has(kind) || typeof dialog.showModal !== "function") return;
      if (isActive()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      try {
        adapter.prepareDecision?.(kind, trigger);
      } catch {
        // Route-local preparation is optional; the route handler remains fail-closed.
      }
      let requiresConfirmation = false;
      try {
        requiresConfirmation = Boolean(adapter.shouldConfirm(kind, trigger));
      } catch {
        requiresConfirmation = false;
      }
      if (!requiresConfirmation) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openDecision(trigger, kind);
    }

    function handleCancel(event) {
      event.preventDefault();
      cancelDecision();
    }

    root.addEventListener("click", captureDiscard, true);
    keepButton.addEventListener("click", cancelDecision);
    confirmButton.addEventListener("click", confirmDecision);
    dialog.addEventListener("cancel", handleCancel);

    return Object.freeze({
      isActive,
      cancel: cancelDecision,
      destroy() {
        if (pending) cancelDecision();
        root.removeEventListener("click", captureDiscard, true);
        keepButton.removeEventListener("click", cancelDecision);
        confirmButton.removeEventListener("click", confirmDecision);
        dialog.removeEventListener("cancel", handleCancel);
      }
    });
  }

  window.BoardReplacementGuard = Object.freeze({ install });
})();
