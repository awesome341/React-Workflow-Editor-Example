import anime from 'animejs';

import { Handler } from '.';
import { FabricObject } from '../utils';

class AnimationHandler {
    handler: Handler;

    constructor(handler: Handler) {
        this.handler = handler;
    }

    /**
     * @description Play the animation
     * @param {string} id
     * @param {boolean} [hasControls]
     * @returns
     */
    public play = (id: string, hasControls?: boolean) => {
        const findObject = this.handler.findById(id);
        if (!findObject) {
            return;
        }
        if (findObject.anime) {
            findObject.anime.restart();
            return;
        }
        if (findObject.animation.type === 'none') {
            return;
        }
        const instance = this.getAnimation(findObject, hasControls);
        if (instance) {
            findObject.set('anime', instance);
            findObject.set({
                hasControls: false,
                lockMovementX: true,
                lockMovementY: true,
                hoverCursor: 'pointer',
            });
            this.handler.canvas.requestRenderAll();
            instance.play();
        }
    }

    /**
     * @description Pause the animation
     * @param {string} id
     * @returns
     */
    public pause = (id: string) => {
        const findObject = this.handler.findById(id);
        if (!findObject) {
            return;
        }
        findObject.anime.pause();
    }

    /**
     * @description Stop the animation
     * @param {string} id
     * @param {boolean} [hasControls=true]
     * @returns
     */
    public stop = (id: string, hasControls = true) => {
        const findObject = this.handler.findById(id);
        if (!findObject) {
            return;
        }
        this.initAnimation(findObject, hasControls);
    }

    /**
     * @description Restart the animation
     * @param {string} id
     * @returns
     */
    public restart = (id: string) => {
        const findObject = this.handler.findById(id);
        if (!findObject) {
            return;
        }
        if (!findObject.anime) {
            return;
        }
        this.stop(id);
        this.play(id);
    }

    /**
     * @description Init animation
     * @param {FabricObject} obj
     * @param {boolean} [hasControls=true]
     * @returns
     */
    public initAnimation = (obj: FabricObject, hasControls = true) => {
        if (!obj.anime) {
            return;
        }
        let option;
        if (this.handler.editable) {
            option = {
                anime: null,
                hasControls,
                lockMovementX: !hasControls,
                lockMovementY: !hasControls,
                hoverCursor: hasControls ? 'move' : 'pointer',
            };
        } else {
            option = {
                anime: null,
                hasControls: false,
                lockMovementX: true,
                lockMovementY: true,
                hoverCursor: 'pointer',
            };
        }
        anime.remove(obj);
        const { type } = obj.animation;
        if (type === 'fade') {
            Object.assign(option, {
                opacity: obj.originOpacity,
                originOpacity: null,
            });
        } else if (type === 'bounce') {
            if (obj.animation.bounce === 'vertical') {
                Object.assign(option, {
                    top: obj.originTop,
                    originTop: null,
                });
            } else {
                Object.assign(option, {
                    left: obj.originLeft,
                    originLeft: null,
                });
            }
        } else if (type === 'shake') {
            if (obj.animation.shake === 'vertical') {
                Object.assign(option, {
                    top: obj.originTop,
                    originTop: null,
                });
            } else {
                Object.assign(option, {
                    left: obj.originLeft,
                    originLeft: null,
                });
            }
        } else if (type === 'scaling') {
            Object.assign(option, {
                scaleX: obj.originScaleX,
                scaleY: obj.originScaleY,
                originScaleX: null,
                originScaleY: null,
            });
        } else if (type === 'rotation') {
            Object.assign(option, {
                angle: obj.originAngle,
                originAngle: null,
            });
        } else if (type === 'flash') {
            Object.assign(option, {
                fill: obj.originFill,
                stroke: obj.originStroke,
                originFill: null,
                origniStroke: null,
            });
        } else {
            console.warn('Not supported type.');
        }
        obj.set(option);
        this.handler.canvas.renderAll();
    }

    /**
     * @description Get animation option
     * @param {FabricObject} obj
     * @param {boolean} [hasControls]
     * @returns
     */
    getAnimation = (obj: FabricObject, hasControls?: boolean) => {
        const { delay = 100, duration = 100, autoplay = true, loop = true, type, ...other } = obj.animation;
        const option = {
            targets: obj,
            delay,
            loop,
            autoplay,
            duration,
            direction: 'alternate',
            begin: () => {
                obj.set({
                    hasControls: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    hoverCursor: 'pointer',
                });
                this.handler.canvas.requestRenderAll();
            },
            update: (e: any) => {
                if (type === 'flash') {
                    // I do not know why it works. Magic code...
                    const fill = e.animations[0].currentValue;
                    const stroke = e.animations[1].currentValue;
                    obj.set('fill', '');
                    obj.set('fill', fill);
                    obj.set('stroke', stroke);
                }
                obj.setCoords();
                this.handler.canvas.requestRenderAll();
            },
            complete: () => {
                this.initAnimation(obj, hasControls);
            },
        };
        if (type === 'fade') {
            const { opacity = 0 } = other;
            obj.set('originOpacity', obj.opacity);
            Object.assign(option, {
                opacity,
                easing: 'easeInQuad',
            });
        } else if (type === 'bounce') {
            const { offset = 1 } = other;
            if (other.bounce === 'vertical') {
                obj.set('originTop', obj.top);
                Object.assign(option, {
                    top: obj.top + offset,
                    easing: 'easeInQuad',
                });
            } else {
                obj.set('originLeft', obj.left);
                Object.assign(option, {
                    left: obj.left + offset,
                    easing: 'easeInQuad',
                });
            }
        } else if (type === 'shake') {
            const { offset = 1 } = other;
            if (other.shake === 'vertical') {
                obj.set('originTop', obj.top);
                Object.assign(option, {
                    top: obj.top + offset,
                    delay: 0,
                    elasticity: 1000,
                    duration: 500,
                });
            } else {
                obj.set('originLeft', obj.left);
                Object.assign(option, {
                    left: obj.left + offset,
                    delay: 0,
                    elasticity: 1000,
                    duration: 500,
                });
            }
        } else if (type === 'scaling') {
            const { scale = 1 } = other;
            obj.set('originScaleX', obj.scaleX);
            obj.set('originScaleY', obj.scaleY);
            const scaleX = obj.scaleX * scale;
            const scaleY = obj.scaleY * scale;
            Object.assign(option, {
                scaleX,
                scaleY,
                easing: 'easeInQuad',
            });
        } else if (type === 'rotation') {
            obj.set('originAngle', obj.angle);
            Object.assign(option, {
                angle: other.angle,
                easing: 'easeInQuad',
            });
        } else if (type === 'flash') {
            const { fill = obj.fill, stroke = obj.stroke } = other;
            obj.set('originFill', obj.fill as string);
            obj.set('originStroke', obj.stroke);
            Object.assign(option, {
                fill,
                stroke,
                easing: 'easeInQuad',
            });
        } else {
            console.warn('Not supported type.');
            return null;
        }
        return anime(option);
    }
}

export default AnimationHandler;
