(function () {
  const BOX_SIZE = 3;
  const SIZE = 9;

  function indexToRowCol(index) {
    return { row: Math.floor(index / SIZE), col: index % SIZE };
  }

  function rowColToIndex(row, col) {
    return row * SIZE + col;
  }

  function parseGrid(gridString) {
    return gridString.split("").map((char) => Number(char));
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function getBoxStart(value) {
    return Math.floor(value / BOX_SIZE) * BOX_SIZE;
  }

  function getPeers(index) {
    const { row, col } = indexToRowCol(index);
    const peers = new Set();

    for (let offset = 0; offset < SIZE; offset += 1) {
      peers.add(rowColToIndex(row, offset));
      peers.add(rowColToIndex(offset, col));
    }

    const boxRow = getBoxStart(row);
    const boxCol = getBoxStart(col);
    for (let currentRow = boxRow; currentRow < boxRow + BOX_SIZE; currentRow += 1) {
      for (let currentCol = boxCol; currentCol < boxCol + BOX_SIZE; currentCol += 1) {
        peers.add(rowColToIndex(currentRow, currentCol));
      }
    }

    peers.delete(index);
    return peers;
  }

  function collectConflicts(board, index) {
    const value = board[index];
    if (!value) {
      return [];
    }

    const conflicts = [];
    for (const peerIndex of getPeers(index)) {
      if (board[peerIndex] === value) {
        conflicts.push(peerIndex);
      }
    }
    return conflicts;
  }

  function isSolved(board, solution) {
    return board.every((value, index) => value === solution[index]);
  }

  function createNotesState() {
    return Array.from({ length: SIZE * SIZE }, () => new Set());
  }

  window.SudokuCore = {
    SIZE,
    parseGrid,
    formatTime,
    indexToRowCol,
    rowColToIndex,
    getPeers,
    collectConflicts,
    isSolved,
    createNotesState
  };
})();
