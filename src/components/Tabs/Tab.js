import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  closeTab,
  closeAllTabs,
  lockTab,
  unlockTab,
} from '../../actions/tabsActions';
import { setActiveTab } from '../../actions/activeTabActions';
import { ContextMenu, MenuItem, ContextMenuTrigger } from 'react-contextmenu';
import { Icon } from '@fluentui/react/lib/Icon';
import styled from 'styled-components';
const { ipcRenderer } = window.require('electron');

const StyledTab = styled.div`
  flex: 0 0 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5rem 1rem;
  user-select: none;
  white-space: nowrap;
  background-color: ${({ theme, activeTab }) =>
    activeTab ? theme.bg.activeTabBg : theme.bg.tabBg};
  &:not(:last-child) {
    border-right: 2px solid ${({ theme }) => theme.bg.appBg};
  }
  &:hover {
    cursor: pointer;
    background-color: ${({ theme }) => theme.bg.selectedBg};
  }
`;

const StyledContextMenu = styled(ContextMenu)`
  background-color: ${({ theme }) => theme.bg.appBg};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: stretch;
  z-index: 1000;
  box-shadow: ${({ theme }) => theme.shadows.menuShadow};
`;

const StyledMenuItem = styled(MenuItem)`
  padding: 2px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  &:hover {
    background-color: ${({ theme }) => theme.bg.selectedBg};
  }
`;

const StyledTabIcon = styled(Icon)`
  font-size: 70%;
  margin-left: 10px;
`;

const Tab = ({ id, name }) => {
  const activeTab = useSelector((state) => state.activeTab);
  const tabs = useSelector((state) => state.tabs);
  const dispatch = useDispatch();

  const currentTab = tabs.find((item) => item.id === id);
  const { isLocked } = currentTab;

  // const [isLocked, setLocked] = useState(false);

  const closeThisTab = (e) => {
    e.stopPropagation();
    ipcRenderer.send('close-tab', id, currentTab.path);
    if (id === activeTab && tabs.length > 1) {
      const nextTab = tabs.filter((item) => item.id !== activeTab)[0].id;

      dispatch(setActiveTab(nextTab));
    }

    dispatch(closeTab(id));
  };

  const closeAll = () => {
    const firstLocked = tabs.filter((item) => item.isLocked)[0];

    ipcRenderer.send('close-tabs', {
      excludedTabs: tabs.filter((item) => item.isLocked).map((item) => item.id),
    });

    firstLocked && dispatch(setActiveTab(firstLocked.id));

    dispatch(closeAllTabs());
  };

  const setActive = () => {
    dispatch(setActiveTab(id));
  };

  const toggleLock = () => {
    if (isLocked) {
      dispatch(unlockTab(id));
    } else {
      dispatch(lockTab(id));
    }
  };

  // TODO: Replace icons in context menu with shortcuts
  // Add shortcuts ctrl+w ctrl+t to create and close tabs

  return (
    <React.Fragment>
      <ContextMenuTrigger id={id}>
        {' '}
        <StyledTab
          activeTab={id === activeTab ? true : false}
          onClick={setActive}
        >
          <span>{name}</span>
          {isLocked ? (
            <StyledTabIcon iconName='LockSolid' />
          ) : (
            <StyledTabIcon iconName='ChromeClose' onClick={closeThisTab} />
          )}
        </StyledTab>
      </ContextMenuTrigger>{' '}
      <StyledContextMenu id={id}>
        {!isLocked && (
          <StyledMenuItem data={{ foo: 'bar' }} onClick={closeThisTab}>
            Close <StyledTabIcon iconName='Clear' />
          </StyledMenuItem>
        )}
        <StyledMenuItem data={{ foo: 'bar' }} onClick={toggleLock}>
          {isLocked ? 'Unlock' : 'Lock'}{' '}
          <StyledTabIcon iconName={isLocked ? 'UnlockSolid' : 'LockSolid'} />
        </StyledMenuItem>
        <StyledMenuItem data={{ foo: 'bar' }} onClick={closeAll}>
          Close All <StyledTabIcon iconName='Broom' />
        </StyledMenuItem>
        <MenuItem divider />
      </StyledContextMenu>
    </React.Fragment>
  );
};

Tab.defaultProps = {
  id: 'id',
  name: 'default',
  active: 'default',
  setActiveTab: () => {},
};

export default Tab;
