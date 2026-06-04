/**
 * Throttled custom events so the shell (Header) can refresh badges without
 * spamming the API when users trigger many social actions quickly.
 */
const THROTTLE_MS = 2500;
function createThrottledEmitter(eventName) {
    let lastFire = 0;
    let timer = null;
    return function emit() {
        if (typeof window === 'undefined')
            return;
        const fire = () => {
            lastFire = Date.now();
            window.dispatchEvent(new CustomEvent(eventName));
        };
        const elapsed = Date.now() - lastFire;
        if (elapsed >= THROTTLE_MS) {
            fire();
            return;
        }
        if (timer)
            return;
        timer = setTimeout(() => {
            timer = null;
            fire();
        }, THROTTLE_MS - elapsed);
    };
}
export const emitNotificationsChanged = createThrottledEmitter('app:notifications-changed');
export const emitMessagesChanged = createThrottledEmitter('app:messages-changed');
export const emitNetworkChanged = createThrottledEmitter('app:network-changed');
