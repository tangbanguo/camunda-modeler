'use strict';

var domify = require('min-dom/lib/domify');

var BpmnJS = require('bpmn-js/lib/Modeler'),
    is = require('bpmn-js/lib/util/ModelUtil').is,
    DiagramJsOrigin = require('diagram-js-origin');

var menuUpdater = require('../menuUpdater');

var propertiesPanelModule = require('bpmn-js-properties-panel'),
    camundaModdlePackage = require('bpmn-js-properties-panel/lib/provider/camunda/camunda-moddle');


function createBpmnJS(element, propertiesPanel) {

  var propertiesPanelConfig = {
    'config.propertiesPanel': ['value', { parent: propertiesPanel }]
  };

  return new BpmnJS({
    container: element,
    position: 'absolute',
    additionalModules: [
      DiagramJsOrigin,
      propertiesPanelModule,
      propertiesPanelConfig
    ],
    moddleExtensions: {camunda: camundaModdlePackage}
  });
}


function DiagramControl(diagramFile) {

  var $el = domify('<div>'),
      $propertiesPanel = domify('<div id="js-properties-panel">'),
      modeler = this.modeler = createBpmnJS($el, $propertiesPanel);

  var self = this;

  var commandStackIdx = -1,
      attachedScope;

  function apply() {
    if (attachedScope) {
      attachedScope.$applyAsync();
    }
  }

  function imported(err, warnings) {
    var canvas = modeler.get('canvas');

    if (self.viewbox) {
      canvas.viewbox(self.viewbox);
    }

    self.editorActions = modeler.get('editorActions');
  }

  modeler.on('selection.changed', function(evt) {
    var elements = modeler.get('selection').get(),
        hasSelection = !!elements.length,
        enabled = false;

    if ((elements.length === 1 &&
       !(is(elements[0], 'bpmn:Process') || is(elements[0], 'bpmn:Collaboration'))) ||
       elements.length > 1) {
      enabled = true;
    }

    menuUpdater.update({
      selection: hasSelection
    });
  });

  modeler.on('commandStack.changed', function(e) {
    var commandStack = modeler.get('commandStack');

    self.canUndo = commandStack.canUndo();
    self.canRedo = commandStack.canRedo();

    diagramFile.unsaved = (commandStackIdx !== commandStack._stackIdx);

    menuUpdater.update({
      history: [ self.canUndo, self.canRedo ],
      saving: diagramFile.unsaved
    });
  });

  modeler.on('commandStack.changed', apply);

  this.saveViewbox = function (event) {
    event.preventDefault();
    self.viewbox = event.viewbox;
  };

  modeler.on('canvas.viewbox.changed', this.saveViewbox);

  this.resetEditState = function() {
    var commandStack = modeler.get('commandStack');

    commandStackIdx = commandStack._stackIdx;

    diagramFile.unsaved = false;
  };

  this.redrawDiagram = function() {
    if (self.xml !== diagramFile.contents) {
      modeler.importXML(self.xml, imported);

      diagramFile.unsaved = true;
    }
  };

  this.save = function(done) {
    modeler.saveXML({ format: true }, function(err, xml) {
      if (typeof done === 'function') {
        done(err, xml);
      }

      self.xml = diagramFile.contents = xml;

      apply();
    });
  };

  modeler.on('import.success', this.save);

  modeler.on('commandStack.changed', this.save);

  this.attach = function(scope, element) {
    attachedScope = scope;

    element.appendChild($el);
    element.appendChild($propertiesPanel);

    if (!modeler.diagram) {
      if (diagramFile.contents) {
        modeler.importXML(diagramFile.contents, imported);
      } else {
        modeler.createDiagram(imported);
      }
    }
  };

  this.detach = function() {
    var parent = $el.parentNode;

    if (parent) {
      attachedScope = null;
      parent.removeChild($el);
      parent.removeChild($propertiesPanel);
    }
  };

  this.triggerAction = function(action, opts) {
    modeler.get('editorActions').trigger(action, opts);
  };

  this.hasSelection = function() {
    try {
      var selection = modeler.get('selection');
      return !!selection.get().length;
    } catch (e) {
      return false;
    }
  };

  this.destroy = function() {
    modeler.destroy();
  };
}


module.exports = DiagramControl;
