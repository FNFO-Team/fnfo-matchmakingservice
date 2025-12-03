/**
 * Modelo de dominio GameRoom
 * Equivalente a GameRoom.java
 */

const { v4: uuidv4 } = require('uuid');
const { RoomStatus } = require('./RoomStatus');

class GameRoom {
  /**
   * @param {Object} params
   * @param {string} params.roomId - ID único de la sala
   * @param {string} params.mode - Modo de juego
   * @param {string} params.status - Estado de la sala
   * @param {string[]} params.players - Lista de IDs de jugadores
   * @param {number} params.maxPlayers - Máximo de jugadores permitidos
   * @param {number} params.currentPlayers - Jugadores actuales
   * @param {number} params.createdAt - Timestamp de creación
   */
  constructor({
    roomId,
    mode,
    status = RoomStatus.FORMING.name,
    players = [],
    maxPlayers,
    currentPlayers = 0,
    createdAt = Date.now(),
  }) {
    this.roomId = roomId;
    this.mode = mode;
    this.status = status;
    this.players = players;
    this.maxPlayers = maxPlayers;
    this.currentPlayers = currentPlayers;
    this.createdAt = createdAt;
  }

  /**
   * Factory method para crear una nueva sala
   * @param {string} roomId - ID de la sala
   * @param {Object} gameMode - Modo de juego
   * @param {number} maxPlayers - Máximo de jugadores
   * @returns {GameRoom}
   */
  static create(roomId, gameMode, maxPlayers) {
    return new GameRoom({
      roomId,
      mode: gameMode.name,
      status: RoomStatus.FORMING.name,
      players: [],
      maxPlayers,
      currentPlayers: 0,
      createdAt: Date.now(),
    });
  }

  /**
   * Genera un ID único para sala
   * @returns {string}
   */
  static generateRoomId() {
    return `room_${uuidv4().substring(0, 8)}`;
  }

  /**
   * Crea una instancia desde JSON
   * @param {Object|string} json
   * @returns {GameRoom|null}
   */
  static fromJSON(json) {
    if (!json) return null;
    
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    
    return new GameRoom({
      roomId: data.roomId,
      mode: data.mode,
      status: data.status,
      players: data.players || [],
      maxPlayers: data.maxPlayers,
      currentPlayers: data.currentPlayers,
      createdAt: data.createdAt,
    });
  }

  /**
   * Convierte a JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      roomId: this.roomId,
      mode: this.mode,
      status: this.status,
      players: this.players,
      maxPlayers: this.maxPlayers,
      currentPlayers: this.currentPlayers,
      createdAt: this.createdAt,
    };
  }

  /**
   * Verifica si la sala está llena
   * @returns {boolean}
   */
  isFull() {
    return this.players.length >= this.maxPlayers;
  }

  /**
   * Verifica si puede aceptar más jugadores
   * @returns {boolean}
   */
  canAcceptPlayer() {
    return (
      this.players.length < this.maxPlayers &&
      this.status !== RoomStatus.IN_PROGRESS.name
    );
  }

  /**
   * Agrega un jugador a la sala
   * @param {string} playerId - ID del jugador
   * @returns {boolean} - true si se agregó exitosamente
   */
  addPlayer(playerId) {
    if (!this.canAcceptPlayer()) {
      return false;
    }
    
    // Evitar duplicados
    if (this.players.includes(playerId)) {
      return false;
    }
    
    this.players.push(playerId);
    this.currentPlayers = this.players.length;
    return true;
  }

  /**
   * Remueve un jugador de la sala
   * @param {string} playerId - ID del jugador
   * @returns {boolean}
   */
  removePlayer(playerId) {
    const index = this.players.indexOf(playerId);
    if (index === -1) {
      return false;
    }
    
    this.players.splice(index, 1);
    this.currentPlayers = this.players.length;
    return true;
  }

  /**
   * Marca la sala como lista
   */
  setReady() {
    if (this.players.length >= 2) {
      this.status = RoomStatus.READY.name;
    }
  }

  /**
   * Marca la sala como en progreso
   */
  setInProgress() {
    this.status = RoomStatus.IN_PROGRESS.name;
  }

  /**
   * Marca la sala como finalizada
   */
  setFinished() {
    this.status = RoomStatus.FINISHED.name;
  }

  /**
   * Verifica si la sala está lista para comenzar
   * @returns {boolean}
   */
  isReady() {
    return (
      this.players.length >= 2 &&
      this.status === RoomStatus.READY.name
    );
  }
}

module.exports = GameRoom;