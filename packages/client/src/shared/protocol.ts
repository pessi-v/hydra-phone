// Messages sent from controller → display
export type ControllerMessage =
  | { type: 'patch'; code: string }
  | { type: 'param'; path: (string | number)[]; value: number };

// Messages sent from display → controller (and server → both)
export type DisplayMessage =
  | { type: 'paired'; sessionId: string }
  | { type: 'ready'; sessionId: string }
  | { type: 'error'; message: string }
  | { type: 'fps'; fps: number }
  | { type: 'disconnected'; role: 'display' | 'controller' };
