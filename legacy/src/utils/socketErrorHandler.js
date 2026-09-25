/**
 * Socket.IO Error Handler Wrapper
 * 
 * Wraps async socket event handlers to catch and handle errors consistently
 * Ensures all socket errors are logged and emitted in a consistent format
 */

const logger = require('./logger');

/**
 * Wraps an async socket event handler with error handling
 * Socket.IO handlers receive (data) and socket is available via closure
 * 
 * @param {Function} handler - Async socket event handler function (data, socket)
 * @param {string} eventName - Name of the socket event (for logging)
 * @returns {Function} - Wrapped handler with error handling
 */
function wrapSocketHandler(handler, eventName) {
  return function(data) {
    // Socket is available via closure (this is the socket instance)
    const socketInstance = this;
    
    (async () => {
      try {
        await handler(data, socketInstance);
      } catch (error) {
        // Log the error with context
        logger.logError(error, {
          context: `socket_handler_error`,
          eventName,
          socketId: socketInstance?.id,
          userId: socketInstance?.userId,
          userEmail: socketInstance?.userEmail,
          errorMessage: error.message,
          errorStack: error.stack
        });

        // Emit consistent error format
        const errorCode = error.code || 'SERVER_ERROR';
        const errorMessage = error.message || 'An error occurred';
        
        if (socketInstance && socketInstance.emit) {
          socketInstance.emit(`${eventName.split(':')[0]}:error`, {
            code: errorCode,
            message: errorMessage,
            event: eventName
          });
        }
      }
    })();
  };
}

/**
 * Wraps multiple socket event handlers at once
 * 
 * @param {Object} handlers - Object with event names as keys and handlers as values
 * @returns {Object} - Object with wrapped handlers
 */
function wrapSocketHandlers(handlers) {
  const wrapped = {};
  for (const [eventName, handler] of Object.entries(handlers)) {
    wrapped[eventName] = wrapSocketHandler(handler, eventName);
  }
  return wrapped;
}

module.exports = {
  wrapSocketHandler,
  wrapSocketHandlers
};
