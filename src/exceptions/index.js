/**
 * Excepciones personalizadas del microservicio
 */

class MatchmakingException extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'MatchmakingException';
    this.statusCode = statusCode;
    this.timestamp = Date.now();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      status: this.statusCode,
      timestamp: this.timestamp,
    };
  }
}

class RoomNotFoundException extends MatchmakingException {
  constructor(roomId) {
    super(`Sala no encontrada: ${roomId}`, 404);
    this.name = 'RoomNotFoundException';
    this.roomId = roomId;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      error: 'ROOM_NOT_FOUND',
      roomId: this.roomId,
    };
  }
}

class PlayerNotFoundException extends MatchmakingException {
  constructor(playerId) {
    super(`Jugador no encontrado: ${playerId}`, 404);
    this.name = 'PlayerNotFoundException';
    this.playerId = playerId;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      error: 'PLAYER_NOT_FOUND',
      playerId: this.playerId,
    };
  }
}

class ValidationException extends MatchmakingException {
  constructor(message, errors = []) {
    super(message, 400);
    this.name = 'ValidationException';
    this.errors = errors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      error: 'VALIDATION_ERROR',
      validationErrors: this.errors,
    };
  }
}

class RoomFullException extends MatchmakingException {
  constructor(roomId) {
    super(`La sala ${roomId} está llena`, 409);
    this.name = 'RoomFullException';
    this.roomId = roomId;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      error: 'ROOM_FULL',
      roomId: this.roomId,
    };
  }
}

class PlayerAlreadyInQueueException extends MatchmakingException {
  constructor(playerId) {
    super(`El jugador ${playerId} ya está en la cola de matchmaking`, 409);
    this.name = 'PlayerAlreadyInQueueException';
    this.playerId = playerId;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      error: 'PLAYER_ALREADY_IN_QUEUE',
      playerId: this.playerId,
    };
  }
}

module.exports = {
  MatchmakingException,
  RoomNotFoundException,
  PlayerNotFoundException,
  ValidationException,
  RoomFullException,
  PlayerAlreadyInQueueException,
};