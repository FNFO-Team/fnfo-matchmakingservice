/**
 * Enum para modos de juego
 * Equivalente a GameMode.java
 */

const GameMode = Object.freeze({
  PVP: {
    name: 'PVP',
    description: 'PvP - Jugador vs Jugador',
  },
  BOSS: {
    name: 'BOSS',
    description: 'Boss - Jugadores vs Jefe',
  },
});

/**
 * Obtiene un modo de juego por nombre
 * @param {string} name - Nombre del modo
 * @returns {Object|null} - Objeto del modo o null
 */
const getByName = (name) => {
  const upperName = name?.toUpperCase();
  return GameMode[upperName] || null;
};

/**
 * Verifica si un modo es válido
 * @param {string} mode - Nombre del modo a verificar
 * @returns {boolean}
 */
const isValidMode = (mode) => {
  return getByName(mode) !== null;
};

/**
 * Obtiene todos los modos disponibles
 * @returns {string[]}
 */
const getAllModes = () => {
  return Object.keys(GameMode);
};

module.exports = {
  GameMode,
  getByName,
  isValidMode,
  getAllModes,
};