import React, {
  useState,
  useEffect,
  useRef,
  createRef,
  useCallback,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { openDir, addTab, closeTab } from '../../actions/tabsActions';
import { setActiveTab } from '../../actions/activeTabActions';
import {
  addSelectedFiles,
  clearSelectedFiles,
} from '../../actions/selectFilesActions';
import styled from 'styled-components';
import { hexToRgba } from 'hex-and-rgba';
import { nanoid } from 'nanoid';
import { Icon } from '@fluentui/react/lib/Icon';

import useMousePosition from '@react-hook/mouse-position';
import composeRefs from '@seznam/compose-react-refs';
import useDynamicRefs from 'use-dynamic-refs';

import NewTabContent from './NewTabContent';
import TabItem from './TabItem';
import deerBg from '../../img/deer.svg';

const { remote, ipcRenderer, shell } = window.require('electron');

const StyledTabContent = styled.div`
  z-index: ${({ active }) => (active ? 100 : 50)};
  visibility: ${({ active }) => (active ? 'visible' : 'hidden')};
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
  grid-gap: 20px;
  overflow-y: auto;
  background: url(${deerBg});
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center center;
  &::-webkit-scrollbar {
    width: 1rem;
    background-color: ${({ theme }) => theme.bg.activeTabBg};
  }
  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.bg.tabBg};
    border-left: 2px solid ${({ theme }) => theme.bg.activeTabBg};
    border-right: 2px solid ${({ theme }) => theme.bg.activeTabBg};
  }
  &::-webkit-scrollbar-thumb:hover {
    background-color: ${({ theme }) => theme.bg.scrollbarBg};
  }
`;

const StyledFiles = styled.div`
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, min-content));
  grid-auto-rows: min-content;
  grid-gap: 20px;
  align-items: start;
  justify-items: center;
  background-color: ${({ theme }) =>
    hexToRgba(theme.bg.appBg + theme.opac.tabOpac).toString()};
  position: relative;
`;

// TODO: Add margin to grid or empty row on the top for the nav element

const StyledNav = styled.div`
  width: 100%;
  height: ${({ theme }) => theme.sizes.navHeight};
  position: fixed;
  border-bottom: 3px solid ${({ theme }) => theme.bg.tabBg};
  border-top: 3px solid ${({ theme }) => theme.bg.tabBg};
  display: flex;
  justify-content: flex-start;
  align-items: stretch;
  font-size: ${({ theme }) => theme.font.pathBarFontSize};
  z-index: 150;
`;

const StyledNavPlaceholder = styled.div`
  align-self: stretch;
  justify-self: stretch;
  grid-column: 1 / -1;
  height: ${({ theme }) => theme.sizes.navHeight};
`;

const StyledUp = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  border: none;
  background-color: darkgreen;
  color: ${({ theme }) => theme.colors.appColor};
  padding: 0 5px;
  cursor: pointer;
  flex-grow: 0;
  flex-shrink: 0;
  font-size: ${({ theme }) => theme.font.pathBarFontSize};
  &:focus {
    outline: ${({ theme }) => theme.bg.selectedBg} solid
      ${({ theme }) => theme.sizes.focusOutlineWidth};
  }
  &:disabled {
    background-color: lightgray;
    cursor: default;
  }
`;

const StyledTabPath = styled.input`
  flex-grow: 1;
  flex-shrink: 0;
  background-color: ${({ theme }) => theme.bg.pathBarBg};
  color: ${({ theme }) => theme.colors.appColor};
  border: none;
  padding: 0 1rem;
  opacity: 0.6;
  font-size: ${({ theme }) => theme.font.pathBarFontSize};
  &:focus {
    opacity: 1;
    outline: ${({ theme }) => theme.bg.selectedBg} solid
      ${({ theme }) => theme.sizes.focusOutlineWidth};
  }
`;

const StyledSelectionFrame = styled.div`
  position: absolute;
  top: ${({ selectionRect }) => Math.min(selectionRect.y1, selectionRect.y2)}px;
  left: ${({ selectionRect }) =>
    Math.min(selectionRect.x1, selectionRect.x2)}px;
  width: ${({ selectionRect }) =>
    Math.abs(selectionRect.x1 - selectionRect.x2)}px;
  height: ${({ selectionRect }) =>
    Math.abs(selectionRect.y1 - selectionRect.y2)}px;
  border: 2px dashed blue;
  background-color: ${({ theme }) => theme.bg.selectedBg};
  z-index: 1000;
  opacity: 0.5;
  display: ${({ show }) => (show ? 'block' : 'none')};
`;

const TabContent = ({ id, name, content, createNew = false, path }) => {
  const contentRef = useRef(null);
  const filesRef = useRef(null);
  const selectionFrameRef = useRef(null);

  // Todo Give TabItem elements refs somehow and then get their boundingClientRects
  const elementsRefs = useRef(content.map(() => createRef()));
  const [loadedItems, setLoadItems] = useState(100);

  const [mousePosition, mouseRef] = useMousePosition(
    0, // enterDelay
    0, // leaveDelay
    15 // fps
  );
  const [mouseIsDown, setMouseIsDown] = useState(false);
  const [isDrawingSelectionRect, setDrawingSelectionRect] = useState(false);
  const [selectionRect, setSelectionRect] = useState({
    x1: null,
    y1: null,
    x2: null,
    y2: null,
  });

  const activeTab = useSelector((state) => state.activeTab);
  const selectedStore = useSelector((state) => state.selected);
  const dispatch = useDispatch();

  // Optimize handleSelect with useCallback hook

  const handleSelect = useCallback(
    (e, selectedName) => {
      // TODO: rectangle selection onMouseDown/onMouseUp select elements
      // under drawn rectangle and remove rectangle from the DOM

      if (e.ctrlKey && selectedStore.includes(selectedName)) {
        dispatch(
          addSelectedFiles(
            selectedStore.filter((item) => item !== selectedName)
          )
        );
        return;
      } else if (e.ctrlKey && !selectedStore.includes(selectedName)) {
        dispatch(addSelectedFiles([...selectedStore, selectedName]));
        return;
      } else if (e.shiftKey && selectedStore.length > 0) {
        const elementFrom = selectedStore[selectedStore.length - 1];

        const contentIdxFrom = content.findIndex(
          (item) => item.name === elementFrom
        );
        const contentIdxTo = content.findIndex(
          (item) => item.name === selectedName
        );

        const newSelectedArr = content
          .slice(
            Math.min(contentIdxFrom, contentIdxTo),
            Math.max(contentIdxFrom, contentIdxTo)
          )
          .map((i) => i.name);

        const nextSelectedStore = [
          ...selectedStore,
          ...newSelectedArr,
          selectedName,
        ];
        const nextUniqueStore = [...new Set(nextSelectedStore)];
        dispatch(addSelectedFiles(nextUniqueStore));
        return;
      } else if (!e.ctrlKey && !selectedStore.includes(selectedName)) {
        dispatch(addSelectedFiles([selectedName]));
        return;
      } else {
        dispatch(clearSelectedFiles());
        return;
      }
    },
    [content, dispatch, selectedStore]
  );

  const addTabAndActivate = () => {
    const newTab = {
      id: nanoid(),
      name: 'New',
      content: [],
      createNew: true,
      path: '/',
    };
    dispatch(addTab(newTab));
    dispatch(setActiveTab(newTab.id));
    dispatch(closeTab(id));
  };

  const handleGoUp = () => {
    if (path.length <= 2) {
      addTabAndActivate();
      return;
    }
    let path_arr = path.split('/');

    path_arr.splice(-2, 2);
    const newPath = path_arr.join('/') + '/';
    dispatch(openDir(id, newPath));
  };

  const handleLoadMoreOnScroll = (e) => {
    const contentEl = contentRef.current;
    try {
      if (loadedItems >= content.length) {
        return;
      }
    } catch (err) {
      console.log(err);
    }

    if (
      contentEl.scrollHeight - 150 <=
      Math.ceil(contentEl.scrollTop + contentEl.clientHeight)
    ) {
      console.log('Scrolled bottom');
      setLoadItems((prev) => prev + 50);
    }
  };

  const renderContent = () => {
    return content
      .slice(0, loadedItems)
      .map((item, i) => (
        <TabItem
          key={`${item.name} ${i}`}
          {...item}
          selected={selectedStore.includes(item.name)}
          handleSelect={handleSelect}
        />
      ));
  };

  useEffect(() => {
    dispatch(clearSelectedFiles());
  }, [activeTab, dispatch]);

  useEffect(() => {
    ipcRenderer.on('select-all', (event, data) => {
      const contentNames = content.map((i) => i.name);

      dispatch(addSelectedFiles(contentNames));
    });
  }, [content, dispatch, selectedStore]);

  useEffect(() => {
    ipcRenderer.on('copy-to-clipboard', (event, data) => {
      ipcRenderer.send('copied-file', path, selectedStore);
    });

    ipcRenderer.on('paste-from-clipboard', (event, data) => {
      ipcRenderer.send('pasted-file', path);
    });

    ipcRenderer.on('edit-action-complete', (event, data) => {
      dispatch(openDir(id, path));
    });

    return () => {
      ipcRenderer.removeAllListeners();
    };
  }, [path, selectedStore]);

  // TODO: create selected files reucer and actions
  // set selected array to [] on open new tab or close current or switch to another tab
  // it is needed to CRUD operations with selected files

  // TODO: add mousemove/mousedown/mouseup events through addEventListener on mount in useEffect hook to ref

  const handleMouseDown = (e) => {
    if (e.target !== filesRef.current) {
      // Target is TabItem => OpenDir on dblclick
      return;
    }

    setMouseIsDown(true);
    setSelectionRect((prev) => ({
      ...prev,
      x1: mousePosition.x,
      y1: mousePosition.y,
    }));
  };

  const handleMouseUp = (e) => {
    console.log(
      'SelectionFrameRef',
      selectionFrameRef.current.getBoundingClientRect()
    );

    setMouseIsDown(false);
    setDrawingSelectionRect(false);
    setSelectionRect((prev) => ({
      ...prev,
      x2: mousePosition.x,
      y2: mousePosition.y,
    }));
  };

  const handleMouseMove = (e) => {
    if (mouseIsDown) {
      setDrawingSelectionRect(true);
      setSelectionRect((prev) => ({
        ...prev,
        x2: mousePosition.x,
        y2: mousePosition.y,
      }));
    } else {
      return;
    }
  };

  useEffect(() => {
    console.log('SelectionRect', selectionRect);
  }, [selectionRect]);

  return (
    <StyledTabContent
      ref={contentRef}
      active={id === activeTab}
      onScroll={handleLoadMoreOnScroll}
    >
      {createNew || path === '/' ? (
        <NewTabContent />
      ) : (
        <StyledFiles
          ref={composeRefs(mouseRef, filesRef)}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <StyledNavPlaceholder />
          <StyledNav>
            <StyledUp onClick={handleGoUp}>
              <Icon iconName='SortUp' className='ms-IconExample' />
            </StyledUp>
            <StyledTabPath value={path} onChange={() => {}} readonly />
          </StyledNav>

          {renderContent()}
          <StyledSelectionFrame
            selectionRect={selectionRect}
            ref={selectionFrameRef}
            show={isDrawingSelectionRect}
          />
        </StyledFiles>
      )}
    </StyledTabContent>
  );
};

export default TabContent;
