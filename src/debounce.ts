export interface Debounced<Args extends unknown[], Result> {
    // Schedule the callback and resolve with its result after the debounce delay
    call(...args: Args): Promise<Result>;
    // Clear the scheduled callback and reject its pending Promise
    cancel(): void;
    // Expose the timer ID so callers can check whether a call is pending
    timer: {
        id: number | null
    };
}

export function createDebounce<Args extends unknown[], Result>(
    callback: (...args: Args) => Result | Promise<Result>,
    delay = 150
): Debounced<Args, Result> {
    const timer = { id: null as number | null  };
    // Keep the reject function for the call whose timer is currently pending
    let rejectPending: ((reason?: unknown) => void) | null = null;

    const call = (...args: Args): Promise<Result> => {
        if (timer.id !== null) {
			// A newer call replaces the pending one, so clear its timer and reject its Promise
			window.clearTimeout(timer.id);
			timer.id = null;
            rejectPending?.(new Error("Debounced call superseded"));
        }

        return new Promise<Result>((resolve, reject) => {
            rejectPending = reject;
            timer.id = window.setTimeout(() => {
                timer.id = null;
                rejectPending = null;
                
                // Start the callback in a Promise chain so synchronous throws are rejected too
                Promise.resolve()
                    .then(() => callback(...args))
                    .then(resolve, reject);
            }, delay);
        });        
    };

    const cancel = (): void => {
        if (timer.id) {
			// Cancellation prevents the callback from running, so reject its pending Promise
			window.clearTimeout(timer.id);
			timer.id = null;
			rejectPending?.(new Error("Debounced call cancelled"));
			rejectPending = null;
        }
    };

    return { call, cancel, timer };
}
