import {v4 as uuidv4} from 'uuid';

export const makeFrameID: () => string = uuidv4;
export const makeRequestID: () => string = uuidv4;
