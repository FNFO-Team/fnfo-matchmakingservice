/**
 * Data Transfer Objects (DTOs)
 */

class MatchmakingRequest {
  constructor({ playerId, mode }) {
    this.playerId = playerId;
    this.mode = mode;
  }

  static fromBody(body) {
    return new MatchmakingRequest({
      playerId: body.playerId,
      mode: body.mode,
    });
  }
}

class MatchmakingResponse {
  constructor({
    success,
    message,
    queuePosition = null,
    waitingPlayers = null,
  }) {
    this.success = success;
    this.message = message;
    this.queuePosition = queuePosition;
    this.waitingPlayers = waitingPlayers;
  }

  static success(message, queuePosition, waitingPlayers) {
    return new MatchmakingResponse({
      success: true,
      message,
      queuePosition,
      waitingPlayers,
    });
  }

  static failure(message) {
    return new MatchmakingResponse({
      success: false,
      message,
    });
  }

  toJSON() {
    return {
      success: this.success,
      message: this.message,
      queuePosition: this.queuePosition,
      waitingPlayers: this.waitingPlayers,
    };
  }
}

class RoomResponse {
  constructor({
    roomId,
    players,
    mode,
    status,
    currentPlayers,
    maxPlayers,
    createdAt,
  }) {
    this.roomId = roomId;
    this.players = players;
    this.mode = mode;
    this.status = status;
    this.currentPlayers = currentPlayers;
    this.maxPlayers = maxPlayers;
    this.createdAt = createdAt;
  }

  static fromGameRoom(room) {
    return new RoomResponse({
      roomId: room.roomId,
      players: room.players,
      mode: room.mode,
      status: room.status,
      currentPlayers: room.currentPlayers,
      maxPlayers: room.maxPlayers,
      createdAt: room.createdAt,
    });
  }

  toJSON() {
    return {
      roomId: this.roomId,
      players: this.players,
      mode: this.mode,
      status: this.status,
      currentPlayers: this.currentPlayers,
      maxPlayers: this.maxPlayers,
      createdAt: this.createdAt,
    };
  }
}

class RoomNotificationEvent {
  constructor({ roomId, players, mode, timestamp = Date.now() }) {
    this.roomId = roomId;
    this.players = players;
    this.mode = mode;
    this.timestamp = timestamp;
  }

  static fromRoom(room) {
    return new RoomNotificationEvent({
      roomId: room.roomId,
      players: room.players,
      mode: room.mode,
      timestamp: Date.now(),
    });
  }

  toJSON() {
    return {
      roomId: this.roomId,
      players: this.players,
      mode: this.mode,
      timestamp: this.timestamp,
    };
  }
}

class ErrorResponse {
  constructor({ error, message, status, timestamp = Date.now() }) {
    this.error = error;
    this.message = message;
    this.status = status;
    this.timestamp = timestamp;
  }

  toJSON() {
    return {
      error: this.error,
      message: this.message,
      status: this.status,
      timestamp: this.timestamp,
    };
  }
}

class MatchmakingStats {
  constructor({ pvpQueueSize, bossQueueSize, totalRooms, timestamp = Date.now() }) {
    this.pvpQueueSize = pvpQueueSize;
    this.bossQueueSize = bossQueueSize;
    this.totalRooms = totalRooms;
    this.timestamp = timestamp;
  }

  toJSON() {
    return {
      pvpQueueSize: this.pvpQueueSize,
      bossQueueSize: this.bossQueueSize,
      totalRooms: this.totalRooms,
      timestamp: this.timestamp,
    };
  }
}

module.exports = {
  MatchmakingRequest,
  MatchmakingResponse,
  RoomResponse,
  RoomNotificationEvent,
  ErrorResponse,
  MatchmakingStats,
};