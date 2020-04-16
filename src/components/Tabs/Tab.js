import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closeTab } from '../../actions/tabsActions';
import { setActiveTab } from '../../actions/activeTabActions';
import styled from 'styled-components';

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
  }
`;

const StyledXBtn = styled.span`
  margin-left: 1rem;
  font-size: 1.2rem;
`;

const Tab = ({ id, name }) => {
  const activeTab = useSelector((state) => state.activeTab);
  const tabs = useSelector((state) => state.tabs);
  const dispatch = useDispatch();

  const closeThisTab = (e) => {
    e.stopPropagation();
    if (id === activeTab && tabs.length > 1) {
      const nextTab = tabs.filter((item) => item.id !== activeTab)[0].id;

      dispatch(setActiveTab(nextTab));
    }

    dispatch(closeTab(id));
  };

  const setActive = () => {
    dispatch(setActiveTab(id));
  };

  return (
    <StyledTab activeTab={id === activeTab ? true : false} onClick={setActive}>
      <span>{name}</span>
      {id === 'plus_tab' ? null : (
        <StyledXBtn onClick={closeThisTab}>&times;</StyledXBtn>
      )}
    </StyledTab>
  );
};

Tab.defaultProps = {
  id: 'id',
  name: 'default',
  active: 'default',
  setActiveTab: () => {},
};

export default Tab;