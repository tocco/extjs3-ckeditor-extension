/*
 * Copyright 2014 Tocco AG
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Parts based on: http://www.oasis38.ru/CF/lib/extjs3-ckeditor/Ext.ux.CKEditor.js
 *
 * Available at: https://github.com/tocco/extjs3-ckeditor-extension
 */

Ext.ns("Ext.ux.form");

/**
 * @class Ext.ux.form.CKEditor
 * @extends Ext.form.TextArea
 * @xtype ckeditor
 *
 * @author Urs Wolfer
 */
Ext.ux.form.CKEditor = Ext.extend(Ext.form.TextArea, {
    /*
     * Internal. CKEditor#setData is asynchronous; we need to call next #setData after first has been finished; otherwise
     * next value will be loosed.
     */
    _setDataInProgress: false,

    /*
     * Internal. See #_setDataInProgress.
     */
    _delayedSetData: [],

    constructor: function(config) {
        this.config = config || {};
        config.listeners = config.listeners || {};
        Ext.applyIf(config.listeners, {
            beforedestroy: this.destroyInstance
                .createDelegate(this),
            scope: this
        });
        Ext.ux.form.CKEditor.superclass.constructor.call(this, config);
    },

    onRender: function(ct, position) {
        var self = this;
        if (!this.el) {
            this.defaultAutoCreate = {
                tag: "textarea",
                autocomplete: "off"
            };
        }
        Ext.ux.form.CKEditor.superclass.onRender.call(this, ct, position);
        if (!this.config.CKConfig) this.config.CKConfig = {};
        var defConfig = {
            resize_enabled: false,
            on: {
                // maximize the editor on startup
                'instanceReady': function(evt) {
                    evt.editor.is_instance_ready = true;
                    evt.editor.resize(self._initialWidth, self._initialHeight);
                }
            }
        };
        Ext.apply(this.config.CKConfig, defConfig);

        // var this.id = CKEDITOR.replace(this.id);
        CKEDITOR.replace(this.id, this.config.CKConfig);
    },

    onResize: function(width, height) {
        Ext.ux.form.CKEditor.superclass.onResize.call(this, width, height);
        this._initialWidth = width;
        this._initialHeight = height;
        if (CKEDITOR.instances[this.id].is_instance_ready) {
            CKEDITOR.instances[this.id].resize(width, height);
        }
    },

    afterRender: function() {
        Ext.ux.form.CKEditor.superclass.afterRender.call(this);
        var self = this;
        this._withEditor(function(ck) {
            ck.on("change", function() {
                self.fireEvent("change", self, self.getValue());
            });
            ck.on("focus", function() {
                self.fireEvent("focus", self);
            });
            ck.on("blur", function() {
                self.fireEvent("blur", self);
            });
        });
    },

    setValue: function(value) {
        this._handleAsyncSetValue(value);

        Ext.ux.form.CKEditor.superclass.setValue.apply(this, arguments);
    },

    _handleAsyncSetValue: function(value) {
        var self = this;

        if (this._setDataInProgress) {
            this._delayedSetData.push(value);
            return;
        } else {
            this._delayedSetData = [];
        }
        this._setDataInProgress = true;

        var editorAvailable = this._withEditor(function (ck) {
            ck.setData(value,
                function() {
                    self._onAfterSetData();
                }
            );
        });
        if (!editorAvailable) {
            self._onAfterSetData.defer(1, self); // call it async just like it would be done in the "normal" #setData flow
        }
    },

    _onAfterSetData: function() {
        this._setDataInProgress = false;
        if (this._delayedSetData.length > 0) {
            var delayedSetDataCopy = this._delayedSetData.slice(0);
            this._delayedSetData = [];
            for (var i = 0; i < delayedSetDataCopy.length; i++) {
                var delayedData = delayedSetDataCopy[i];
                delayedSetDataCopy.splice(i, 1);
                this._handleAsyncSetValue(delayedData);
            }
        }
    },

    getValue: function() {
        if (!this._setDataInProgress) {
            this._withEditor(function(ck) {
                ck.updateElement();
            });
        }
        return Ext.ux.form.CKEditor.superclass.getValue.call(this);
    },

    getRawValue: function() {
        if (!this._setDataInProgress) {
            this._withEditor(function(ck) {
                ck.updateElement();
            });
        }
        return Ext.ux.form.CKEditor.superclass.getRawValue.call(this);
    },

    destroyInstance: function() {
        if (CKEDITOR.instances[this.id]) {
            delete CKEDITOR.instances[this.id];
        }
    },

    /**
     * Calls @param fn on CKEditor when CKEditor is available. Otherwise returns false.
     */
    _withEditor: function(fn) {
        if (CKEDITOR.instances[this.id]) {
            fn.call(this, CKEDITOR.instances[this.id]);
            return true;
        } else {
            return false;
        }
    }
});

Ext.reg("ckeditor", Ext.ux.form.CKEditor);
