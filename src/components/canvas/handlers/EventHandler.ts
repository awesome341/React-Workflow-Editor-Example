import { fabric } from 'fabric';
import anime from 'animejs';

import Handler from './Handler';
import { FabricObject, FabricEvent } from '../utils';
import { VideoObject } from '../objects/Video';
import { NodeObject } from '../objects/Node';

class EventHandler {
    handler: Handler;
    keyCode: number;
    panning: boolean;
    constructor(handler: Handler) {
        this.handler = handler;
    }

    /**
     * @description Attch document event
     */
    public attachEventListener = () => {
        if (this.handler.editable) {
            this.handler.canvas.on({
                'object:modified': this.modified,
                'object:scaling': this.scaling,
                'object:scaled': this.scaled,
                'object:moving': this.moving,
                'object:moved': this.moved,
                'object:rotating': this.rotating,
                'object:rotated': this.rotated,
                'mouse:wheel': this.mousewheel,
                'mouse:down': this.mousedown,
                'mouse:move': this.mousemove,
                'mouse:up': this.mouseup,
                'selection:cleared': this.selection,
                'selection:created': this.selection,
                'selection:updated': this.selection,
                'before:render': this.handler.guidelineOption.enabled ? this.beforeRender : null,
                'after:render': this.handler.guidelineOption.enabled ? this.afterRender : null,
            });
        } else {
            this.handler.canvas.on({
                'mouse:down': this.mousedown,
                'mouse:move': this.mousemove,
                'mouse:out': this.mouseout,
                'mouse:up': this.mouseup,
                'mouse:wheel': this.mousewheel,
            });
        }
        this.handler.canvas.wrapperEl.tabIndex = 1000;
        document.addEventListener('keydown', this.keydown, false);
        document.addEventListener('keyup', this.keyup, false);
        document.addEventListener('mousedown', this.onmousedown, false);
        this.handler.canvas.wrapperEl.addEventListener('contextmenu', this.contextmenu, false);
        if (this.handler.keyEvent.clipboard) {
            document.addEventListener('paste', this.paste, false);
        }
    }

    /**
     * @description Detach document event
     */
    public detachEventListener = () => {
        if (this.handler.editable) {
            this.handler.canvas.off({
                'object:modified': this.modified,
                'object:scaling': this.scaling,
                'object:moving': this.moving,
                'object:moved': this.moved,
                'object:rotating': this.rotating,
                'mouse:wheel': this.mousewheel,
                'mouse:down': this.mousedown,
                'mouse:move': this.mousemove,
                'mouse:up': this.mouseup,
                'selection:cleared': this.selection,
                'selection:created': this.selection,
                'selection:updated': this.selection,
                'before:render': this.beforeRender,
                'after:render': this.afterRender,
            });
        } else {
            this.handler.canvas.off({
                'mouse:down': this.mousedown,
                'mouse:move': this.mousemove,
                'mouse:out': this.mouseout,
                'mouse:up': this.mouseup,
                'mouse:wheel': this.mousewheel,
            });
            this.handler.getObjects().forEach(object => {
                object.off('mousedown', this.handler.eventHandler.object.mousedown);
                if (object.anime) {
                    anime.remove(object);
                }
            });
        }
        document.removeEventListener('keydown', this.keydown);
        document.removeEventListener('keyup', this.keyup);
        document.removeEventListener('mousedown', this.onmousedown);
        this.handler.canvas.wrapperEl.removeEventListener('contextmenu', this.contextmenu);
        if (this.handler.keyEvent.clipboard) {
            document.removeEventListener('paste', this.paste);
        }
    }

    /**
     * @description Individual object event
     * @memberof EventHandler
     */
    public object = {
        /**
         * @description Mouse down on object
         * @param {FabricEvent} opt
         */
        mousedown: (opt: FabricEvent) => {
            const { target } = opt;
            if (target && target.link && target.link.enabled) {
                const { onClick } = this.handler;
                if (onClick) {
                    onClick(this.handler.canvas, target);
                }
            }
        },
        /**
         * @description Mouse double click on object
         * @param {FabricEvent} opt
         */
        mousedblclick: (opt: FabricEvent) => {
            const { target } = opt;
            if (target) {
                const { onDblClick } = this.handler;
                if (onDblClick) {
                    onDblClick(this.handler.canvas, target);
                }
            }
        },
    }

    /**
     * @description Modified object
     * @param {FabricEvent} opt
     * @returns
     */
    public modified = (opt: FabricEvent) => {
        const { target } = opt;
        if (!target) {
            return;
        }
        if (target.type === 'circle' && target.parentId) {
            return;
        }
        const { onModified } = this.handler;
        if (onModified) {
            onModified(target);
        }
    }

    /**
     * @description Moving object
     * @param {FabricEvent} opt
     * @returns
     */
    public moving = (opt: FabricEvent) => {
        const { target } = opt as any;
        if (this.handler.interactionMode === 'crop') {
            this.handler.cropHandler.moving(opt);
        } else {
            if (this.handler.editable && this.handler.guidelineOption.enabled) {
                this.handler.guidelineHandler.movingGuidelines(target);
            }
            if (target.type === 'activeSelection') {
                const activeSelection = target as fabric.ActiveSelection;
                activeSelection.getObjects().forEach((obj: any) => {
                    const left = target.left + obj.left + (target.width / 2);
                    const top = target.top + obj.top + (target.height / 2);
                    if (obj.superType === 'node') {
                        this.handler.portHandler.setCoords({ ...obj, left, top });
                    } else if (obj.superType === 'element') {
                        const { id } = obj;
                        const el = this.handler.elementHandler.findById(id);
                        // TODO... Element object incorrect position
                        this.handler.elementHandler.setPositionByOrigin(el, obj, left, top);
                    }
                });
                return;
            }
            if (target.superType === 'node') {
                this.handler.portHandler.setCoords(target);
            } else if (target.superType === 'element') {
                const { id } = target;
                const el = this.handler.elementHandler.findById(id);
                this.handler.elementHandler.setPosition(el, target);
            }
        }
    }

    /**
     * @description Moved object
     * @param {FabricEvent} opt
     */
    public moved = (opt: FabricEvent) => {
        const { target } = opt;
        this.handler.gridHandler.setCoords(target);
        if (!this.handler.transactionHandler.active) {
            this.handler.transactionHandler.save('moved');
        }
        if (target.superType === 'element') {
            const { id } = target;
            const el = this.handler.elementHandler.findById(id);
            this.handler.elementHandler.setPosition(el, target);
        }
    }

    /**
     * @description Scaling object
     * @param {FabricEvent} opt
     */
    public scaling = (opt: FabricEvent) => {
        const { target } = opt as any;
        if (this.handler.interactionMode === 'crop') {
            this.handler.cropHandler.resize(opt);
        }
        // TODO...this.handler.guidelineHandler.scalingGuidelines(target);
        if (target.superType === 'element') {
            const { id, width, height } = target;
            const el = this.handler.elementHandler.findById(id);
            // update the element
            this.handler.elementHandler.setScaleOrAngle(el, target);
            this.handler.elementHandler.setSize(el, target);
            this.handler.elementHandler.setPosition(el, target);
            const video = target as VideoObject;
            if (video.type === 'video' && video.player) {
                video.player.setPlayerSize(width, height);
            }
        }
    }

    /**
     * @description Scaled object
     * @param {FabricEvent} opt
     */
    public scaled = (_opt: FabricEvent) => {
        if (!this.handler.transactionHandler.active) {
            this.handler.transactionHandler.save('scaled');
        }
    }

    /**
     * @description Rotating object
     * @param {FabricEvent} opt
     */
    public rotating = (opt: FabricEvent) => {
        const { target } = opt as any;
        if (target.superType === 'element') {
            const { id } = target;
            const el = this.handler.elementHandler.findById(id);
            // update the element
            this.handler.elementHandler.setScaleOrAngle(el, target);
        }
    }

    /**
     * @description Rotated object
     * @param {FabricEvent} opt
     */
    public rotated = (_opt: FabricEvent) => {
        if (!this.handler.transactionHandler.active) {
            this.handler.transactionHandler.save('rotated');
        }
    }

    /**
     * @description Moing object at keyboard arrow key down
     * @param {KeyboardEvent} e
     * @returns
     */
    public arrowmoving = (e: KeyboardEvent) => {
        const activeObject = this.handler.canvas.getActiveObject() as FabricObject;
        if (!activeObject) {
            return false;
        }
        if (activeObject.id === 'workarea') {
            return false;
        }
        if (e.keyCode === 38) {
            activeObject.set('top', activeObject.top - 2);
            activeObject.setCoords();
            this.handler.canvas.renderAll();
            return true;
        } else if (e.keyCode === 40) {
            activeObject.set('top', activeObject.top + 2);
            activeObject.setCoords();
            this.handler.canvas.renderAll();
            return true;
        } else if (e.keyCode === 37) {
            activeObject.set('left', activeObject.left - 2);
            activeObject.setCoords();
            this.handler.canvas.renderAll();
            return true;
        } else if (e.keyCode === 39) {
            activeObject.set('left', activeObject.left + 2);
            activeObject.setCoords();
            this.handler.canvas.renderAll();
            return true;
        }
        if (this.handler.onModified) {
            this.handler.onModified(activeObject);
        }
        return true;
    }

    /**
     * @description Zoom at mouse wheel
     * @param {FabricEvent<WheelEvent>} opt
     * @returns
     */
    public mousewheel = (opt: FabricEvent) => {
        const event = opt as FabricEvent<WheelEvent>;
        const { zoomEnabled } = this.handler;
        if (!zoomEnabled) {
            return;
        }
        const delta = event.e.deltaY;
        let zoomRatio = this.handler.canvas.getZoom();
        if (delta > 0) {
            zoomRatio -= 0.05;
        } else {
            zoomRatio += 0.05;
        }
        this.handler.zoomHandler.zoomToPoint(new fabric.Point(this.handler.canvas.getWidth() / 2, this.handler.canvas.getHeight() / 2), zoomRatio);
        event.e.preventDefault();
        event.e.stopPropagation();
    }

    /**
     * @description Object mouse down
     * @param {FabricEvent<MouseEvent>} opt
     * @returns
     */
    public mousedown = (opt: FabricEvent) => {
        const event = opt as FabricEvent<MouseEvent>;
        const { editable } = this.handler;
        if (event.e.altKey && editable) {
            this.handler.modeHandler.grab();
            this.panning = true;
            return;
        }
        if (this.handler.interactionMode === 'grab') {
            this.panning = true;
            return;
        }
        const target = event.target as any;
        if (editable) {
            if (this.handler.prevTarget && this.handler.prevTarget.superType === 'link') {
                this.handler.prevTarget.set({
                    stroke: this.handler.prevTarget.originStroke,
                });
            }
            if (target && target.type === 'fromPort') {
                if (this.handler.interactionMode === 'link' && this.handler.activeLine) {
                    console.warn('Already drawing links.');
                    return;
                }
                this.handler.linkHandler.init(target);
                return;
            }
            if (target && this.handler.interactionMode === 'link' && (target.type === 'toPort' || target.superType === 'node')) {
                let toPort;
                if (target.superType === 'node') {
                    toPort = target.toPort;
                } else {
                    toPort = target;
                }
                if (toPort && toPort.links.some((link: any) => link.fromNode.id === this.handler.activeLine.fromNode.id)) {
                    console.warn('Duplicate connections can not be made.');
                    return;
                }
                this.handler.linkHandler.generate(toPort);
                return;
            }
            this.handler.guidelineHandler.viewportTransform = this.handler.canvas.viewportTransform;
            this.handler.guidelineHandler.zoom = this.handler.canvas.getZoom();
            if (this.handler.interactionMode === 'selection') {
                if (target && target.superType === 'link') {
                    target.set({
                        stroke: 'green',
                    });
                }
                this.handler.prevTarget = target;
                return;
            }
            if (this.handler.interactionMode === 'polygon') {
                if (target && this.handler.pointArray.length && target.id === this.handler.pointArray[0].id) {
                    this.handler.drawingHandler.polygon.generate(this.handler.pointArray);
                } else {
                    this.handler.drawingHandler.polygon.addPoint(event);
                }
            } else if (this.handler.interactionMode === 'line') {
                if (this.handler.pointArray.length && this.handler.activeLine) {
                    this.handler.drawingHandler.line.generate(event);
                } else {
                    this.handler.drawingHandler.line.addPoint(event);
                }
            } else if (this.handler.interactionMode === 'arrow') {
                if (this.handler.pointArray.length && this.handler.activeLine) {
                    this.handler.drawingHandler.arrow.generate(event);
                } else {
                    this.handler.drawingHandler.arrow.addPoint(event);
                }
            }
        }
    }

    /**
     * @description Mouse move on canvas
     * @param {FabricEvent<MouseEvent>} opt
     * @returns
     */
    public mousemove = (opt: FabricEvent) => {
        const event = opt as FabricEvent<MouseEvent>;
        if (this.handler.interactionMode === 'grab' && this.panning) {
            this.handler.modeHandler.moving(event.e);
            this.handler.canvas.requestRenderAll();
        }
        if (!this.handler.editable && event.target) {
            if (event.target.superType === 'element') {
                return;
            }
            if (event.target.id !== 'workarea') {
                if (event.target !== this.handler.target) {
                    this.handler.tooltipHandler.show(event.target);
                }
            } else {
                this.handler.tooltipHandler.hide(event.target);
            }
        }
        if (this.handler.interactionMode === 'polygon') {
            if (this.handler.activeLine && this.handler.activeLine.class === 'line') {
                const pointer = this.handler.canvas.getPointer(event.e);
                this.handler.activeLine.set({ x2: pointer.x, y2: pointer.y });
                const points = this.handler.activeShape.get('points');
                points[this.handler.pointArray.length] = {
                    x: pointer.x,
                    y: pointer.y,
                };
                this.handler.activeShape.set({
                    points,
                });
                this.handler.canvas.requestRenderAll();
            }
        } else if (this.handler.interactionMode === 'line') {
            if (this.handler.activeLine && this.handler.activeLine.class === 'line') {
                const pointer = this.handler.canvas.getPointer(event.e);
                this.handler.activeLine.set({ x2: pointer.x, y2: pointer.y });
            }
            this.handler.canvas.requestRenderAll();
        } else if (this.handler.interactionMode === 'arrow') {
            if (this.handler.activeLine && this.handler.activeLine.class === 'line') {
                const pointer = this.handler.canvas.getPointer(event.e);
                this.handler.activeLine.set({ x2: pointer.x, y2: pointer.y });
            }
            this.handler.canvas.requestRenderAll();
        } else if (this.handler.interactionMode === 'link') {
            if (this.handler.activeLine && this.handler.activeLine.class === 'line') {
                const pointer = this.handler.canvas.getPointer(event.e);
                this.handler.activeLine.set({ x2: pointer.x, y2: pointer.y });
            }
            this.handler.canvas.requestRenderAll();
        }
        return;
    }

    /**
     * @description Mouse up on canvas
     * @param {FabricEvent<MouseEvent>} opt
     * @returns
     */
    public mouseup = (opt: FabricEvent) => {
        const event = opt as FabricEvent<MouseEvent>;
        if (this.handler.interactionMode === 'grab') {
            this.panning = false;
            return;
        }
        const { target, e } = event;
        if (this.handler.interactionMode === 'selection') {
            if (target && e.shiftKey && target.superType === 'node') {
                const node = target as NodeObject;
                this.handler.canvas.discardActiveObject();
                const nodes = [] as NodeObject[];
                this.handler.nodeHandler.getNodePath(node, nodes);
                const activeSelection = new fabric.ActiveSelection(nodes, {
                    canvas: this.handler.canvas,
                    ...this.handler.activeSelection,
                });
                this.handler.canvas.setActiveObject(activeSelection);
                this.handler.canvas.requestRenderAll();
            }
        }
        if (this.handler.editable && this.handler.guidelineOption.enabled) {
            this.handler.guidelineHandler.verticalLines.length = 0;
            this.handler.guidelineHandler.horizontalLines.length = 0;
        }
        this.handler.canvas.renderAll();
    }

    /**
     * @description Mouse out on canvas
     * @param {FabricEvent<MouseEvent>} opt
     */
    public mouseout = (opt: FabricEvent) => {
        const event = opt as FabricEvent<MouseEvent>;
        if (!event.target) {
            this.handler.tooltipHandler.hide();
        }
    }

    /**
     * @description Selection event on canvas
     * @param {FabricEvent} opt
     */
    public selection = (opt: FabricEvent) => {
        const { onSelect, activeSelection } = this.handler;
        const target = opt.target as FabricObject<fabric.ActiveSelection>;
        if (target && target.type === 'activeSelection') {
            target.set({
                ...activeSelection,
            });
        }
        if (onSelect) {
            onSelect(target);
        }
    }

    /**
     * @description Before the render
     * @param {FabricEvent} _opt
     */
    public beforeRender = (_opt: FabricEvent) => {
        this.handler.canvas.clearContext(this.handler.guidelineHandler.ctx);
    }

    /**
     * @description After the render
     * @param {FabricEvent} _opt
     */
    public afterRender = (_opt: FabricEvent) => {
        for (let i = this.handler.guidelineHandler.verticalLines.length; i--;) {
            this.handler.guidelineHandler.drawVerticalLine(this.handler.guidelineHandler.verticalLines[i]);
        }
        for (let i = this.handler.guidelineHandler.horizontalLines.length; i--;) {
            this.handler.guidelineHandler.drawHorizontalLine(this.handler.guidelineHandler.horizontalLines[i]);
        }
        this.handler.guidelineHandler.verticalLines.length = 0;
        this.handler.guidelineHandler.horizontalLines.length = 0;
    }

    /**
     * @description Called resize on canvas
     * @param {number} nextWidth
     * @param {number} nextHeight
     * @returns
     */
    public resize = (nextWidth: number, nextHeight: number) => {
        this.handler.canvas.setWidth(nextWidth).setHeight(nextHeight);
        this.handler.canvas.setBackgroundColor(this.handler.canvasOption.backgroundColor, this.handler.canvas.renderAll.bind(this.handler.canvas));
        if (!this.handler.workarea) {
            return;
        }
        const diffWidth = (nextWidth / 2) - (this.handler.width / 2);
        const diffHeight = (nextHeight / 2) - (this.handler.height / 2);
        this.handler.width = nextWidth;
        this.handler.height = nextHeight;
        if (this.handler.workarea.layout === 'fixed') {
            this.handler.canvas.centerObject(this.handler.workarea);
            this.handler.workarea.setCoords();
            if (this.handler.gridOption.enabled) {
                return;
            }
            this.handler.canvas.getObjects().forEach((obj: any, index) => {
                if (index !== 0) {
                    const left = obj.left + diffWidth;
                    const top = obj.top + diffHeight;
                    obj.set({
                        left,
                        top,
                    });
                    obj.setCoords();
                    if (obj.superType === 'element') {
                        const { id } = obj;
                        const el = this.handler.elementHandler.findById(id);
                        // update the element
                        this.handler.elementHandler.setPosition(el, obj);
                    }
                }
            });
            this.handler.canvas.renderAll();
            return;
        }
        let scaleX = nextWidth / this.handler.workarea.width;
        const scaleY = nextHeight / this.handler.workarea.height;
        if (this.handler.workarea.layout === 'responsive') {
            if (this.handler.workarea.height > this.handler.workarea.width) {
                scaleX = scaleY;
                if (nextWidth < this.handler.workarea.width * scaleX) {
                    scaleX = scaleX * (nextWidth / (this.handler.workarea.width * scaleX));
                }
            } else {
                if (nextHeight < this.handler.workarea.height * scaleX) {
                    scaleX = scaleX * (nextHeight / (this.handler.workarea.height * scaleX));
                }
            }
            const deltaPoint = new fabric.Point(diffWidth, diffHeight);
            this.handler.canvas.relativePan(deltaPoint);
            const center = this.handler.canvas.getCenter();
            this.handler.zoomHandler.zoomToPoint(new fabric.Point(center.left, center.top), scaleX);
            this.handler.canvas.renderAll();
            return;
        }
        const diffScaleX = nextWidth / (this.handler.workarea.width * this.handler.workarea.scaleX);
        const diffScaleY = nextHeight / (this.handler.workarea.height * this.handler.workarea.scaleY);
        this.handler.workarea.set({
            scaleX,
            scaleY,
        });
        this.handler.canvas.getObjects().forEach((obj: any) => {
            const { id } = obj;
            if (obj.id !== 'workarea') {
                const left = obj.left * diffScaleX;
                const top = obj.top * diffScaleY;
                const newScaleX = obj.scaleX * diffScaleX;
                const newScaleY = obj.scaleY * diffScaleY;
                obj.set({
                    scaleX: newScaleX,
                    scaleY: newScaleY,
                    left,
                    top,
                });
                obj.setCoords();
                if (obj.superType === 'element') {
                    const video = obj as VideoObject;
                    const { width, height } = obj;
                    const el = this.handler.elementHandler.findById(id);
                    this.handler.elementHandler.setSize(el, obj);
                    if (video.player) {
                        video.player.setPlayerSize(width, height);
                    }
                    this.handler.elementHandler.setPosition(el, obj);
                }
            }
        });
        this.handler.canvas.renderAll();
    }

    /**
     * @description Paste event on canvas
     * @param {ClipboardEvent} e
     * @returns
     */
    public paste = (e: ClipboardEvent) => {
        if (this.handler.canvas.wrapperEl !== document.activeElement) {
            return false;
        }
        if (e.preventDefault) {
            e.preventDefault();
        }
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        const clipboardData = e.clipboardData;
        if (clipboardData.types.length) {
            clipboardData.types.forEach((clipboardType: string) => {
                if (clipboardType === 'text/plain') {
                    const textPlain = clipboardData.getData('text/plain');
                    try {
                        const objects = JSON.parse(textPlain);
                        const { gridOption: { grid = 10 } } = this.handler;
                        if (objects && Array.isArray(objects)) {
                            const filteredObjects = objects.filter(obj => obj !== null);
                            if (filteredObjects.length === 1) {
                                const obj = filteredObjects[0];
                                if (typeof obj.cloneable !== 'undefined' && !obj.cloneable) {
                                    return;
                                }
                                obj.left = obj.properties.left + grid;
                                obj.top = obj.properties.top + grid;
                                const createdObj = this.handler.add(obj, false, true, false);
                                this.handler.canvas.setActiveObject(createdObj as FabricObject);
                                this.handler.canvas.requestRenderAll();
                            } else {
                                const nodes = [] as any[];
                                const targets = [] as any[];
                                objects.forEach(obj => {
                                    if (!obj) {
                                        return;
                                    }
                                    if (obj.superType === 'link') {
                                        obj.fromNode = nodes[obj.fromNodeIndex].id;
                                        obj.toNode = nodes[obj.toNodeIndex].id;
                                    } else {
                                        obj.left = obj.properties.left + grid;
                                        obj.top = obj.properties.top + grid;
                                    }
                                    const createdObj = this.handler.add(obj, false, true, false);
                                    if (obj.superType === 'node') {
                                        nodes.push(createdObj);
                                    } else {
                                        targets.push(createdObj);
                                    }
                                });
                                const activeSelection = new fabric.ActiveSelection(nodes.length ? nodes : targets, {
                                    canvas: this.handler.canvas,
                                    ...this.handler.activeSelection,
                                });
                                this.handler.canvas.setActiveObject(activeSelection);
                                this.handler.canvas.requestRenderAll();
                            }
                            if (!this.handler.transactionHandler.active) {
                                this.handler.transactionHandler.save('paste');
                            }
                            this.handler.copy();
                        }
                    } catch (error) {
                        console.error(error);
                        // const item = {
                        //     id: uuid(),
                        //     type: 'textbox',
                        //     text: textPlain,
                        // };
                        // this.handler.add(item, true);
                    }
                } else if (clipboardType === 'text/html') {
                    // Todo ...
                    // const textHtml = clipboardData.getData('text/html');
                    // console.log(textHtml);
                } else if (clipboardType === 'Files') {
                    // Array.from(clipboardData.files).forEach((file) => {
                    //     const { type } = file;
                    //     if (type === 'image/png' || type === 'image/jpeg' || type === 'image/jpg') {
                    //         const item = {
                    //             id: uuid(),
                    //             type: 'image',
                    //             file,
                    //             superType: 'image',
                    //         };
                    //         this.handler.add(item, true);
                    //     } else {
                    //         console.error('Not supported file type');
                    //     }
                    // });
                }
            });
        }
        return true;
    }

    /**
     * Document keyboard event
     *
     * @param {KeyboardEvent} e
     * @returns
     */
    public keydown = (e: KeyboardEvent) => {
        const { keyEvent, editable } = this.handler;
        if (!Object.keys(keyEvent).length) {
            return;
        }
        const { move, all, copy, paste, esc, del, clipboard, transaction } = keyEvent;
        if (e.keyCode === 87) {
            this.keyCode = e.keyCode;
        } else if (e.keyCode === 81) {
            this.keyCode = e.keyCode;
        }
        if (e.altKey && editable) {
            this.handler.canvas.defaultCursor = 'grab';
            if (this.handler.workarea.hoverCursor) {
                this.handler.workarea.hoverCursor = 'grab';
            }
        }
        if (e.keyCode === 27 && esc) {
            if (this.handler.interactionMode === 'selection') {
                this.handler.canvas.discardActiveObject();
                this.handler.canvas.renderAll();
            } else if (this.handler.interactionMode === 'polygon') {
                this.handler.drawingHandler.polygon.finish();
            } else if (this.handler.interactionMode === 'line') {
                this.handler.drawingHandler.line.finish();
            } else if (this.handler.interactionMode === 'arrow') {
                this.handler.drawingHandler.arrow.finish();
            } else if (this.handler.interactionMode === 'link') {
                this.handler.linkHandler.finish();
            }
            this.handler.tooltipHandler.hide();
        }
        if (this.handler.canvas.wrapperEl !== document.activeElement) {
            return;
        }
        if (editable) {
            if (e.keyCode === 46 && del) {
                this.handler.remove();
            } else if (e.code.includes('Arrow') && move) {
                this.arrowmoving(e);
            } else if (e.ctrlKey && e.keyCode === 65 && all) {
                e.preventDefault();
                this.handler.selectAll();
            } else if (e.ctrlKey && e.keyCode === 67 && copy) {
                e.preventDefault();
                this.handler.copy();
            } else if (e.ctrlKey && e.keyCode === 86 && paste && !clipboard) {
                e.preventDefault();
                this.handler.paste();
            } else if (e.ctrlKey && e.keyCode === 90 && transaction) {
                e.preventDefault();
                this.handler.transactionHandler.undo();
            } else if (e.ctrlKey && e.keyCode === 89 && transaction) {
                e.preventDefault();
                this.handler.transactionHandler.redo();
            }
            return;
        }
        return;
    }

    /**
     * @description Key up on canvas
     * @param {KeyboardEvent} _e
     */
    public keyup = (_e: KeyboardEvent) => {
        if (this.keyCode !== 87) {
            this.handler.canvas.defaultCursor = 'default';
            if (this.handler.workarea.hoverCursor) {
                this.handler.workarea.hoverCursor = 'default';
            }
            this.handler.modeHandler.selection();
        }
    }

    /**
     * @description Context menu on canvas
     * @param {MouseEvent} e
     */
    public contextmenu = (e: MouseEvent) => {
        e.preventDefault();
        const { editable, onContext } = this.handler;
        if (editable && onContext) {
            const target = this.handler.canvas.findTarget(e, false) as FabricObject;
            if (target && target.type !== 'activeSelection') {
                this.handler.select(target);
            }
            this.handler.contextmenuHandler.show(e, target);
        }
    }

    /**
     * @description Mouse down on canvas
     * @param {MouseEvent} _e
     */
    public onmousedown = (_e: MouseEvent) => {
        this.handler.contextmenuHandler.hide();
    }
}

export default EventHandler;
