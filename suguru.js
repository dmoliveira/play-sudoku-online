(function () {
  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function parseGrid(gridString) {
    return gridString.split("").map((char) => Number(char));
  }

  function getSize(meta) {
    return Number.isInteger(meta?.size) ? meta.size : 5;
  }

  function indexToRowCol(index, meta) {
    const size = getSize(meta);
    return { row: Math.floor(index / size), col: index % size };
  }

  function rowColToIndex(row, col, meta) {
    return row * getSize(meta) + col;
  }

  function createNotesState(meta) {
    const size = getSize(meta);
    return Array.from({ length: size * size }, () => new Set());
  }

  function getRegionId(index, meta) {
    return Array.isArray(meta?.cageMap) ? meta.cageMap[index] : null;
  }

  function getPeers(index, meta) {
    const size = getSize(meta);
    const { row, col } = indexToRowCol(index, meta);
    const peers = new Set();

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (rowOffset === 0 && colOffset === 0) {
          continue;
        }
        const nextRow = row + rowOffset;
        const nextCol = col + colOffset;
        if (nextRow >= 0 && nextRow < size && nextCol >= 0 && nextCol < size) {
          peers.add(rowColToIndex(nextRow, nextCol, meta));
        }
      }
    }

    const regionId = getRegionId(index, meta);
    if (regionId !== null && Array.isArray(meta?.cages?.[regionId])) {
      meta.cages[regionId].forEach((peerIndex) => peers.add(peerIndex));
    }

    peers.delete(index);
    return peers;
  }

  function collectConflicts(board, index, meta) {
    const value = board[index];
    if (!value) {
      return [];
    }

    const conflicts = [];
    for (const peerIndex of getPeers(index, meta)) {
      if (board[peerIndex] === value) {
        conflicts.push(peerIndex);
      }
    }
    return conflicts;
  }

  function isSolved(board, solution) {
    return board.every((value, index) => value === solution[index]);
  }

  function hasRegionBoundary(index, direction, meta) {
    const size = getSize(meta);
    const { row, col } = indexToRowCol(index, meta);
    const regionId = getRegionId(index, meta);
    let otherIndex = null;

    if (direction === "right" && col < size - 1) {
      otherIndex = rowColToIndex(row, col + 1, meta);
    }
    if (direction === "bottom" && row < size - 1) {
      otherIndex = rowColToIndex(row + 1, col, meta);
    }
    if (otherIndex === null) {
      return false;
    }

    return getRegionId(otherIndex, meta) !== regionId;
  }

  window.SuguruCore = {
    parseGrid,
    formatTime,
    indexToRowCol,
    rowColToIndex,
    createNotesState,
    getPeers,
    collectConflicts,
    isSolved,
    hasRegionBoundary
  };
})();
