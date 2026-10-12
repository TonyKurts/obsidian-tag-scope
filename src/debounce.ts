export interface Debounced<Args extends unknown[], Result> {
	// Schedule the callback and resolve with its result after the debounce delay.
	// A superseded or cancelled call resolves with undefined.
	call(...args: Args): Promise<Result | undefined>;

	// Cancel the pending call and resolve its promise with undefined.
	cancel(): void;
}

export function createDebounce<Args extends unknown[], Result>(
	callback: (...args: Args) => Result | Promise<Result>,
	delay = 150,
): Debounced<Args, Result> {
    let timeoutId: number | null = null;
	let resolvePending: ((value: Result | undefined) => void) | null = null;

    const cancelPending = () => {
		if (timeoutId === null) return;
		window.clearTimeout(timeoutId);
		timeoutId = null;
		resolvePending?.(undefined);
		resolvePending = null;
	};

    const call = (...args: Args): Promise<Result | undefined> => {
		// Replace the previous pending call with this one.
		cancelPending();

		return new Promise<Result | undefined>((resolve, reject) => {
			resolvePending = resolve;
			timeoutId = window.setTimeout(() => {
				timeoutId = null;
				resolvePending = null;

				// Convert synchronous callback errors into promise rejections.
				Promise.resolve()
					.then(() => callback(...args))
					.then(resolve, reject);
			}, delay);
		});
	};

	const cancel = () => {
		// Prevent the pending callback from running.
		cancelPending();
	};

    return { call, cancel };
}
