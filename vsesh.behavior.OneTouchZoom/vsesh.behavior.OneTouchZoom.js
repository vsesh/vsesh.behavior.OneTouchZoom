/**
 * @fileOverview
 * Поведение изменение масштаба одним касанием. 
 */
ymaps.modules.define('vsesh.behavior.OneTouchZoom', [
    'collection.Item',
    'behavior.storage',
    'util.defineClass',
    'util.math.areEqual',
    'map.action.Continuous'
], function (provide, CollectionItem, behaviorStorage, defineClass, areEqual, ContinuousAction) {
    var MOUSEDOWN_DELAY = 500;
    var MOUSEDOWN_POSITIONS_DIFF = 30;
   /**
     * @class Поведение "изменение масштаба карты одним касанием".
     * @name vsesh.behavior.OneTouchZoom
     * @augments IBehavior
     * @param {Object} [options] Опции.
     * @param {Number} [options.sensitivity = 100] Чувствительность поведения.
     * На сколько пикселей пользователь должен сдвинуть указатель, чтобы измененить масштаб карты на один уровень масштаба.
     */
    var OneTouchBehavior = defineClass(function (options) {
        OneTouchBehavior.superclass.constructor.call(this);
    }, CollectionItem, {
            enable: function () {
                this._lastMouseTimestamp = Number(new Date());
                this.getMap().events.add('mousedown', this._onMouseDown, this);
                this._isEnabled = true;
            },

            disable: function () {
                this._isEnabled = false;
                this.getMap().events.remove('mousedown', this._onMouseDown, this);
            },

            isEnabled: function () {
                return this._isEnabled;
            },

            _onMouseDown: function (event) {
                var timestamp = Number(new Date());
                var currentMouseDownPosition = event.get('position');
                if (Math.abs(this._lastMouseTimestamp - timestamp) > MOUSEDOWN_DELAY || !areEqual(this._lastMouseDownPosition, currentMouseDownPosition, MOUSEDOWN_POSITIONS_DIFF)) {
                    this._lastMouseTimestamp = timestamp;
                } else {
                    var map = this.getMap();
                    this._preventDefaultCallback(event);
                    this._startState = {
                        position: event.get('position'),
                        zoom: map.action.getCurrentState().zoom
                    };
                    this._action = new ContinuousAction();
                    map.action.execute(this._action);
                    map.events
                        .add('mousemove', this._onMouseMove, this)
                        .add('mouseup', this._onMouseUp, this)
                        .once('click', this._preventDefaultCallback, this)
                        .once('dblclick', this._preventDefaultCallback, this);
                    event.get('originalEvent').get('originalEvent');
                    event.get('domEvent').callMethod('preventDefault');
                }
                this._lastMouseDownPosition = currentMouseDownPosition;
            },

            _onMouseMove: function (event) {
                var map = this.getMap();
                var newZoom = this._startState.zoom + ((this._startState.position[1] - event.get('position')[1]) / this.options.get('sensitivity', 100));
                var currentState = map.action.getCurrentState();
                var oldZoom = currentState.zoom;
                this._action.tick({
                    globalPixelCenter: fixedToCenter(
                        currentState.globalPixelCenter,
                        map.converter.pageToGlobal(this._lastMouseDownPosition, oldZoom),
                        Math.pow(2, newZoom - oldZoom)
                    ),
                    zoom: newZoom,
                    duration: 0
                });
                this._preventDefaultCallback(event);
            },

            _onMouseUp: function (event) {
                this._action.end();
                this.getMap().events
                    .remove('mousemove', this._onMouseMove, this)
                    .remove('mouseup', this._onMouseUp, this);
                this._preventDefaultCallback(event);
            },

            _preventDefaultCallback: function (event) {
                event.preventDefault();
                event.get('domEvent').callMethod('preventDefault');
            }
        });

    function fixedToCenter(oldCenter, fixedPoint, scale) {
        var k = (scale - 1) / scale,
            d = [(fixedPoint[0] - oldCenter[0]) * k, (fixedPoint[1] - oldCenter[1]) * k];
        return [
            (oldCenter[0] + d[0]) * scale,
            (oldCenter[1] + d[1]) * scale
        ];
    }

    behaviorStorage.add('vsesh.OneTouchZoom', OneTouchBehavior);
    provide(OneTouchBehavior);
});
