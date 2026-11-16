/**
 * 最小命令管理器：执行、撤销、重做。
 *
 * M2 只承载单格文本命令；批量命令、分区历史与合并策略留到阶段 3。
 *
 * @param {object} [options] 选项
 * @param {(result: object) => void} [options.onApplied] 命令应用后的回调
 * @returns {object} 命令管理器
 */
export function createCommandManager({ onApplied } = {}) {
  const undoStack = [];
  const redoStack = [];

  const notify = (result) => {
    if (onApplied) {
      onApplied(result);
    }
  };

  return {
    /**
     * 执行命令并清空重做栈。
     *
     * @param {object} command 命令
     * @param {object} context 命令上下文
     * @returns {object} 命令结果
     */
    execute(command, context) {
      const result = command.execute(context);
      undoStack.push(command);
      redoStack.length = 0;
      notify(result);
      return result;
    },

    /**
     * 撤销最近一条命令。
     *
     * @param {object} context 命令上下文
     * @returns {boolean} 是否执行了撤销
     */
    undo(context) {
      const command = undoStack.pop();
      if (!command) {
        return false;
      }
      command.undo(context);
      redoStack.push(command);
      notify({ undone: command.type });
      return true;
    },

    /**
     * 重做最近一条被撤销的命令。
     *
     * @param {object} context 命令上下文
     * @returns {boolean} 是否执行了重做
     */
    redo(context) {
      const command = redoStack.pop();
      if (!command) {
        return false;
      }
      const result = command.execute(context);
      undoStack.push(command);
      notify(result);
      return true;
    },

    get canUndo() {
      return undoStack.length > 0;
    },

    get canRedo() {
      return redoStack.length > 0;
    },

    get undoSize() {
      return undoStack.length;
    },
  };
}
