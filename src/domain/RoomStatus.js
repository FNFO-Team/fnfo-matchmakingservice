/**
 * Enum para estados de sala
 * Equivalente a RoomStatus.java
 */

const RoomStatus = Object.freeze({
  FORMING: {
    name: 'FORMING',
    description: 'Sala en formación',
  },
  READY: {
    name: 'READY',
    description: 'Sala lista para comenzar',
  },
  IN_PROGRESS: {
    name: 'IN_PROGRESS',
    description: 'Partida en progreso',
  },
  FINISHED: {
    name: 'FINISHED',
    description: 'Partida finalizada',
  },
});

/**
 * Obtiene un estado por nombre
 * @param {string} name - Nombre del estado
 * @returns {Object|null}
 */
const getByName = (name) => {
  const upperName = name?.toUpperCase();
  return RoomStatus[upperName] || null;
};

/**
 * Verifica si un estado es válido
 * @param {string} status - Nombre del estado
 * @returns {boolean}
 */
const isValidStatus = (status) => {
  return getByName(status) !== null;
};

module.exports = {
  RoomStatus,
  getByName,
  isValidStatus,
};