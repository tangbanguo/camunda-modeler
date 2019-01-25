/* global sinon */

import React from 'react';

import { mount } from 'enzyme';

import {
  Cache,
  WithCachedState
} from '../../../cached';

import {
  DmnEditor
} from '../DmnEditor';

import DmnModeler from 'test/mocks/dmn-js/Modeler';

import { SlotFillRoot } from 'src/app/slot-fill';

import diagramXML from './diagram.dmn';

const { spy } = sinon;


describe('<DmnEditor>', function() {

  it('should render', async function() {
    const {
      instance
    } = await renderEditor(diagramXML);

    expect(instance).to.exist;
  });


  describe('caching behavior', function() {

    let createSpy;

    beforeEach(function() {
      createSpy = sinon.spy(DmnEditor, 'createCachedState');
    });

    afterEach(function() {
      createSpy.restore();
    });


    it('should create modeler if not cached', async function() {

      // when
      const {
        instance
      } = await renderEditor(diagramXML);

      // then
      const {
        modeler
      } = instance.getCached();

      expect(modeler).to.exist;
      expect(createSpy).to.have.been.calledOnce;
    });


    it('should use cached modeler', async function() {

      // given
      const cache = new Cache();

      cache.add('editor', {
        cached: {
          modeler: new DmnModeler()
        },
        __destroy: () => {}
      });

      // when
      await renderEditor(diagramXML, {
        id: 'editor',
        cache
      });

      // then
      expect(createSpy).not.to.have.been.called;
    });

  });


  it('#getModeler', async function() {

    // given
    const { instance } = await renderEditor(diagramXML);

    // when
    const modeler = instance.getModeler();

    // then
    expect(modeler).to.exist;
  });


  it('#getXML', async function() {

    // given
    const {
      instance
    } = await renderEditor(diagramXML);

    const xml = await instance.getXML();

    expect(xml).to.exist;
    expect(xml).to.eql(diagramXML);
  });


  describe('#exportAs', function() {

    let instance;

    beforeEach(async function() {
      instance = (await renderEditor(diagramXML)).instance;
    });


    it('svg', async function() {
      const contents = await instance.exportAs('svg');

      expect(contents).to.exist;
      expect(contents).to.equal('<svg />');
    });


    it('png', async function() {
      const contents = await instance.exportAs('png');

      expect(contents).to.exist;
      expect(contents).to.contain('data:image/png');
    });


    it('jpeg', async function() {
      const contents = await instance.exportAs('jpeg');

      expect(contents).to.exist;
      expect(contents).to.contain('data:image/jpeg');
    });

  });


  describe('#listen', function() {

    function expectHandleChanged(event) {
      return async function() {
        const modeler = new DmnModeler();

        const cache = new Cache();

        cache.add('editor', {
          cached: {
            modeler
          },
          __destroy: () => {}
        });

        const changedSpy = spy();

        await renderEditor(diagramXML, {
          id: 'editor',
          cache,
          onChanged: changedSpy
        });

        modeler._emit(event);

        expect(changedSpy).to.have.been.called;
      };
    }


    it('saveXML.done', expectHandleChanged('saveXML.done'));


    it('attach', expectHandleChanged('attach'));


    it('view.selectionChanged', expectHandleChanged('view.selectionChanged'));


    it('view.directEditingChanged', expectHandleChanged('view.directEditingChanged'));


    it('propertiesPanel.focusin', expectHandleChanged('propertiesPanel.focusin'));


    it('propertiesPanel.focusout', expectHandleChanged('propertiesPanel.focusout'));

  });


  describe('#handleChanged', function() {

    it('should notify about changes', async function() {

      // given
      const changedSpy = (state) => {

        // then
        expect(state).to.include({
          dirty: true,
          editLabel: false,
          redo: true,
          removeSelected: false,
          undo: true
        });
      };

      const cache = new Cache();

      cache.add('editor', {
        cached: {
          lastXML: diagramXML,
          modeler: new DmnModeler({
            modules: {
              commandStack: {
                canRedo: () => true,
                canUndo: () => true,
                _stackIdx: 1
              },
              selection: {
                get: () => []
              }
            }
          }),
          stackIdx: {
            drd: 2
          }
        },
        __destroy: () => {}
      });

      const { instance } = await renderEditor(diagramXML, {
        id: 'editor',
        cache,
        onChanged: changedSpy
      });

      // when
      instance.handleChanged();
    });

  });


  describe('#viewsChanged', function() {

    let instance;

    const view1 = {
      element: { id: 'foo' },
      type: 'drd'
    };

    const view2 = {
      element: { id: 'bar' },
      type: 'decisionTable'
    };

    const views = [view1, view2];

    beforeEach(async function() {
      instance = (await renderEditor(diagramXML)).instance;
    });

    it('should reattach properties panel on view switch', async function() {

      // given
      const modeler = await instance.getModeler();

      const propertiesPanel = modeler.getActiveViewer().get('propertiesPanel');

      const propertiesAttachSpy = sinon.spy(propertiesPanel, 'attachTo');

      // when
      instance.viewsChanged({
        activeView: view1,
        views
      });

      // then
      expect(propertiesAttachSpy).to.be.called;
    });

    it('should NOT reattach properties panel when stay on view', async function() {

      // given
      const modeler = await instance.getModeler();

      instance.viewsChanged({
        activeView: view1,
        views
      });

      const propertiesPanel = modeler.getActiveViewer().get('propertiesPanel');

      const propertiesAttachSpy = sinon.spy(propertiesPanel, 'attachTo');

      // when
      instance.viewsChanged({
        activeView: view1,
        views
      });

      // then
      expect(propertiesAttachSpy).not.to.be.called;
    });
  });


  describe('layout', function() {

    it('should open properties panel', async function() {

      // given
      let layout = {
        propertiesPanel: {
          open: false
        }
      };

      function onLayoutChanged(newLayout) {
        layout = newLayout;
      }

      const {
        wrapper
      } = await renderEditor(diagramXML, {
        layout,
        onLayoutChanged
      });

      const toggle = wrapper.find('.toggle');

      // when
      toggle.simulate('click');

      // then
      expect(layout.propertiesPanel.open).to.be.true;
    });


    it('should close properties panel', async function() {

      // given
      let layout = {
        propertiesPanel: {
          open: true
        }
      };

      function onLayoutChanged(newLayout) {
        layout = newLayout;
      }

      const {
        wrapper
      } = await renderEditor(diagramXML, {
        layout,
        onLayoutChanged
      });

      const toggle = wrapper.find('.toggle');

      // when
      toggle.simulate('click');

      // then
      expect(layout.propertiesPanel.open).to.be.false;
    });


    it('should handle missing layout', async function() {

      // given
      let layout = { };

      // then
      await renderEditor(diagramXML, {
        layout
      });

    });

  });


  describe('errors', function() {

    it('should handle XML export error', async function() {
      // given
      const errorSpy = spy();

      const {
        instance
      } = await renderEditor('export-error', {
        onError: errorSpy
      });

      // make sure editor is dirty
      const commandStack = instance.getModeler().getActiveViewer().get('commandStack');

      commandStack.execute(1);

      let err;

      // when
      try {
        await instance.getXML();
      } catch (e) {
        err = e;
      }

      // then
      expect(err).to.exist;
      expect(errorSpy).to.have.been.calledOnce;
    });


    it('should handle image export error', async function() {
      // given
      const errorSpy = spy();

      const {
        instance
      } = await renderEditor('export-as-error', {
        onError: errorSpy
      });

      let err;

      // when
      try {
        await instance.exportAs('svg');
      } catch (e) {
        err = e;
      }

      // then
      expect(err).to.exist;
      expect(errorSpy).to.have.been.calledOnce;
    });

  });


  describe('import', function() {

    it('should import without errors and warnings', async function() {

      // given
      await renderEditor(diagramXML, {
        onImport
      });

      function onImport(err, warnings) {

        // then
        expect(err).to.not.exist;

        expect(warnings).to.have.length(0);
      }
    });


    it('should import with warnings', async function() {

      // given
      await renderEditor('import-warnings', {
        onImport
      });

      function onImport(error, warnings) {

        // then
        expect(error).not.to.exist;

        expect(warnings).to.have.length(1);
        expect(warnings[0]).to.equal('warning');
      }
    });


    it('should import with error', async function() {

      // given
      await renderEditor('import-error', {
        onImport
      });

      function onImport(error, warnings) {

        // then
        expect(error).to.exist;
        expect(error.message).to.equal('error');

        expect(warnings).to.have.length(0);
      }
    });

  });


  describe('dirty state', function() {

    let instance;

    beforeEach(async function() {
      instance = (await renderEditor(diagramXML)).instance;
    });


    it('should NOT be dirty initially', function() {

      // then
      const dirty = instance.isDirty();

      expect(dirty).to.be.false;
    });


    it('should be dirty after modeling', function() {

      // given
      const { modeler } = instance.getCached();

      // when
      // execute 1 command
      modeler.getActiveViewer().get('commandStack').execute(1);

      // then
      const dirty = instance.isDirty();

      expect(dirty).to.be.true;
    });


    it('should NOT be dirty after modeling -> undo', function() {

      // given
      const { modeler } = instance.getCached();

      modeler.getActiveViewer().get('commandStack').execute(1);

      // when
      modeler.getActiveViewer().get('commandStack').undo();

      // then
      const dirty = instance.isDirty();

      expect(dirty).to.be.false;
    });


    it('should NOT be dirty after save', async function() {

      // given
      const { modeler } = instance.getCached();

      // execute 1 command
      modeler.getActiveViewer().get('commandStack').execute(1);

      // when
      await instance.getXML();

      // then
      const dirty = instance.isDirty();

      expect(dirty).to.be.false;
    });

  });


  describe('editor resize', function() {

    afterEach(sinon.restore);


    it('should resize editor and properties panel on layout change', async function() {

      // given
      const eventBusStub = sinon.stub({ fire() {} }),
            canvasStub = sinon.stub({ resized() {} });

      const cache = new Cache();

      cache.add('editor', {
        cached: {
          modeler: new DmnModeler({
            modules: {
              eventBus: eventBusStub,
              canvas: canvasStub
            }
          })
        }
      });

      const {
        instance
      } = await renderEditor(diagramXML, {
        cache
      });

      const mockLayout = {
        propertiesPanel: {
          open: true,
          width: 500
        }
      };

      eventBusStub.fire.resetHistory();
      canvasStub.resized.resetHistory();

      // when
      const prevProps = instance.props;

      instance.props = { ...prevProps, layout: mockLayout };
      instance.componentDidUpdate(prevProps);

      // expect
      expect(canvasStub.resized).to.be.called;
      expect(eventBusStub.fire).to.be.calledOnceWith('propertiesPanel.resized');
    });

  });


});


// helpers //////////

function noop() {}

const TestEditor = WithCachedState(DmnEditor);

async function renderEditor(xml, options = {}) {
  const {
    layout,
    onChanged,
    onError,
    onImport,
    onLayoutChanged,
    onModal,
    onSheetsChanged
  } = options;

  const slotFillRoot = await mount(
    <SlotFillRoot>
      <TestEditor
        id={ options.id || 'editor' }
        xml={ xml }
        activeSheet={ options.activeSheet || { id: 'dmn' } }
        onChanged={ onChanged || noop }
        onError={ onError || noop }
        onImport={ onImport || noop }
        onLayoutChanged={ onLayoutChanged || noop }
        onModal={ onModal || noop }
        onSheetsChanged={ onSheetsChanged || noop }
        cache={ options.cache || new Cache() }
        layout={ layout || {
          minimap: {
            open: false
          },
          propertiesPanel: {
            open: true
          }
        } }
      />
    </SlotFillRoot>
  );

  const wrapper = slotFillRoot.find(DmnEditor);

  const instance = wrapper.instance();

  return {
    instance,
    wrapper
  };
}