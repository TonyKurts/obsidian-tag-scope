export interface Debounced<Args extends unknown[], Result> {
    // Schedule the callback and resolve with its result after the debounce delay
    call(...args: Args): Promise<Result | undefined>;
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
    let resolvePending: ((value: Result | undefined) => void) | null = null;

    const call = (...args: Args): Promise<Result | undefined> => {
        if (timer.id !== null) {
			// A newer call replaces the pending one, so clear its timer
            // and reject its Promise
			window.clearTimeout(timer.id);
			timer.id = null;
            resolvePending?.(undefined);
            resolvePending = null;
        }

        return new Promise<Result | undefined>((resolve, reject) => {
            resolvePending = resolve;
            timer.id = window.setTimeout(() => {
                timer.id = null;
                resolvePending = null;
                
                // Start the callback in a Promise chain so synchronous throws
                // are rejected too
                Promise.resolve()
                    .then(() => callback(...args))
                    .then(resolve, reject);
            }, delay);
        });        
    };

    const cancel = (): void => {
        if (timer.id) {
			// Cancellation prevents the callback from running, so reject
            // its pending Promise
			window.clearTimeout(timer.id);
			timer.id = null;
			resolvePending?.(undefined);
			resolvePending = null;
        }
    };

    return { call, cancel, timer };
}
