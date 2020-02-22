import { fabric } from 'fabric';
import throttle from 'lodash/throttle';

import Handler from './Handler';
import { FabricObject } from '../utils';
import { NodeObject } from '../objects/Node';
import { LinkObject } from '../objects/Link';

export type TransactionType = 'add'
| 'remove'
| 'moved'
| 'scaled'
| 'rotated'
| 'skewed'
| 'group'
| 'ungroup'
| 'paste'
| 'bringForward'
| 'bringToFront'
| 'sendBackwards'
| 'sendToBack'
| 'redo'
| 'undo'
;

export interface TransactionTransform {
    scaleX?: number;
    scaleY?: number;
    skewX?: number;
    skewY?: number;
    angle?: number;
    left?: number;
    top?: number;
    flipX?: number;
    flipY?: number;
    originX?: string;
    originY?: string;
}

export interface TransactionEvent {
    json: string;
    type: TransactionType;
}

class TransactionHandler {
    handler: Handler;
    redos: TransactionEvent[];
    undos: TransactionEvent[];
    active: boolean = false;
    state: FabricObject[] = [];

    constructor(handler: Handler) {
        this.handler = handler;
    }

    /**
     * @description Init transaction
     */
    init = () => {
        this.redos = [];
        this.undos = [];
    }

    /**
     * @description Save transaction
     * @param {TransactionType} type
     * @param {*} [canvasJSON]
     * @param {boolean} [isWorkarea=true]
     * @returns
     */
    save = (type: TransactionType, canvasJSON?: any, _isWorkarea: boolean = true) => {
        if (!this.handler.keyEvent.transaction) {
            return;
        }
        try {
            if (this.state) {
                const json = JSON.stringify(this.state);
                this.redos = [];
                this.undos.push({
                    type,
                    json,
                });
            }
            const { objects }: { objects: FabricObject[] } = canvasJSON || this.handler.canvas.toJSON(this.handler.propertiesToInclude);
            this.state = objects.filter(obj => {
                if (obj.id === 'workarea') {
                    return false;
                } else if (obj.id === 'grid') {
                    return false;
                } else if (obj.superType === 'port') {
                    return false;
                }
                return true;
            });
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * @description Undo transaction
     * @returns
     */
    undo = throttle(() => {
        const undo = this.undos.pop();
        if (!undo) {
            return;
        }
        this.redos.push({
            type: 'redo',
            json: JSON.stringify(this.state),
        });
        this.replay(undo);
    }, 100);

    /**
     * @description Redo transaction
     * @returns
     */
    redo = throttle(() => {
        const redo = this.redos.pop();
        if (!redo) {
            return;
        }
        this.undos.push({
            type: 'undo',
            json: JSON.stringify(this.state),
        });
        this.replay(redo);
    }, 100)

    /**
     * @description Replay transaction
     */
    replay = (transaction: TransactionEvent) => {
        const objects = JSON.parse(transaction.json) as FabricObject[];
        this.state = objects;
        this.active = true;
        this.handler.canvas.renderOnAddRemove = false;
        this.handler.clear();
        this.handler.canvas.discardActiveObject();
        fabric.util.enlivenObjects(objects, (enlivenObjects: FabricObject[]) => {
            enlivenObjects.forEach(obj => {
                const targetIndex = this.handler.canvas._objects.length;
                if (obj.superType === 'node') {
                    this.handler.canvas.insertAt(obj, targetIndex, false);
                    this.handler.portHandler.create(obj as NodeObject);
                } else if (obj.superType === 'link') {
                    const link = obj as LinkObject;
                    this.handler.objects = this.handler.getObjects();
                    this.handler.linkHandler.create({
                        type: 'curvedLink',
                        fromNode: link.fromNode.id,
                        fromPort: link.fromPort.id,
                        toNode: link.toNode.id,
                        toPort: link.toPort.id,
                    });
                } else {
                    this.handler.canvas.insertAt(obj, targetIndex, false);
                }
            });
            this.handler.canvas.renderOnAddRemove = true;
            this.active = false;
            this.handler.canvas.renderAll();
            this.handler.objects = this.handler.getObjects();
            if (this.handler.onTransaction) {
                this.handler.onTransaction(transaction);
            }
        }, null);
    }
}

export default TransactionHandler;
