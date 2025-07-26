// Custom error handler to prevent "Unexpected token '<'" errors
class ErrorHandler {
  static init() {
    // Add global error handler
    window.addEventListener('error', (event) => {
      // Check if the error is the specific "Unexpected token '<'" error
      if (event.error && event.error.toString().includes("Unexpected token '<'")) {
        console.log('Caught "Unexpected token <" error, handling gracefully');
        event.preventDefault();
        
        // Check if we need to reload resources
        const needsReload = !sessionStorage.getItem('attempted_reload');
        
        if (needsReload) {
          // Set flag to prevent infinite reload loop
          sessionStorage.setItem('attempted_reload', 'true');
          
          // Clear cache and reload only once
          console.log('Attempting to fix by clearing cache and reloading...');
          
          // Use a timeout to ensure the error message is displayed
          setTimeout(() => {
            window.location.reload(true);
          }, 1000);
        } else {
          console.log('Already attempted reload, not trying again');
          // Clear the flag after some time to allow future reload attempts
          setTimeout(() => {
            sessionStorage.removeItem('attempted_reload');
          }, 30000); // 30 seconds
        }
        
        return true;
      }
      return false;
    });
  }
}

export default ErrorHandler;
