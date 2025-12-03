
/**
 * Global Picker State Manager
 * Prevents concurrent picker operations and provides queue functionality
 */
class PickerManager {
  private static isPickerActive = false;
  private static pendingPickers: Array<{
    id: string;
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];

  /**
   * Execute a picker function with concurrency protection
   */
  static async executePicker<T>(
    pickerId: string,
    pickerFn: () => Promise<T>,
  ): Promise<T> {
    // If picker is already active, queue this request
    if (this.isPickerActive) {
      return new Promise<T>((resolve, reject) => {
        this.pendingPickers.push({
          id: pickerId,
          fn: pickerFn,
          resolve,
          reject,
        });
      });
    }

    // Execute picker immediately
    this.isPickerActive = true;

    try {
      return await pickerFn();
    } finally {
      this.isPickerActive = false;

      // Process next picker in queue after a small delay
      setTimeout(() => this.processNextPicker(), 100);
    }
  }

  /**
   * Process the next picker in the queue
   */
  private static processNextPicker(): void {
    if (this.pendingPickers.length === 0) {
      return;
    }

    const nextPicker = this.pendingPickers.shift();
    if (!nextPicker) return;

    // Execute the queued picker
    this.executePicker(nextPicker.id, nextPicker.fn)
      .then(nextPicker.resolve)
      .catch(nextPicker.reject);
  }

  /**
   * Get current picker state
   */
  static getState(): {
    isActive: boolean;
    queueLength: number;
    queuedPickers: string[];
  } {
    return {
      isActive: this.isPickerActive,
      queueLength: this.pendingPickers.length,
      queuedPickers: this.pendingPickers.map((p) => p.id),
    };
  }

  /**
   * Clear all pending pickers (useful for cleanup)
   */
  static clearQueue(): void {
    // Reject all pending pickers
    this.pendingPickers.forEach((picker) => {
      picker.reject(new Error("Picker queue cleared"));
    });

    this.pendingPickers = [];
    this.isPickerActive = false;
  }

  /**
   * Check if picker is available on current platform
   */
  static isPickerAvailable(): boolean {
    // Web environment - pickers are available through HTML5 input elements
    return true;
  }
}

export default PickerManager;
