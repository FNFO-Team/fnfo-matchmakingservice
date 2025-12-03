/**
 * Modelo de dominio Player
 * Equivalente a Player.java
 */

class Player {
  /**
   * @param {Object} params
   * @param {string} params.playerId - ID único del jugador
   * @param {string} params.mode - Modo de juego
   * @param {number} [params.joinedAt] - Timestamp de cuando se unió
   */
  constructor({ playerId, mode, joinedAt = Date.now() }) {
    this.playerId = playerId;
    this.mode = mode;
    this.joinedAt = joinedAt;
  }

  /**
   * Factory method para crear un jugador
   * @param {string} playerId - ID del jugador
   * @param {Object} gameMode - Modo de juego (del enum GameMode)
   * @returns {Player}
   */
  static of(playerId, gameMode) {
    return new Player({
      playerId,
      mode: gameMode.name,
      joinedAt: Date.now(),
    });
  }

  /**
   * Crea una instancia desde un objeto JSON
   * @param {Object} json - Objeto JSON
   * @returns {Player}
   */
  static fromJSON(json) {
    if (!json) return null;
    
    // Si viene como string, parsearlo
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    
    return new Player({
      playerId: data.playerId,
      mode: data.mode,
      joinedAt: data.joinedAt,
    });
  }

  /**
   * Convierte a objeto JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      playerId: this.playerId,
      mode: this.mode,
      joinedAt: this.joinedAt,
    };
  }

  /**
   * Tiempo de espera en cola (milisegundos)
   * @returns {number}
   */
  getWaitTime() {
    return Date.now() - this.joinedAt;
  }
}

module.exports = Player;