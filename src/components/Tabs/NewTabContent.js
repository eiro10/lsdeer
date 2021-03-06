import React, { useEffect, useState, useRef, useContext } from 'react';
import { useSelector } from 'react-redux';
import HardDrive from '../HardDrive';
import styled, { ThemeContext } from 'styled-components';
import { Icon } from '@fluentui/react/lib/Icon';
import FavoriteItem from './FavoriteItem';
import Heading from '../Heading';

const { ipcRenderer } = window.require('electron');

const StyledContent = styled.div`
  padding: 0 5px;
  background-color: ${({ theme }) => theme.bg.appBg};
  overflow-y: auto;
  min-height: 100%;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(${({ theme }) => theme.sizes.colWidth}px, 1fr)
  );
  grid-auto-rows: minmax(auto, ${({ theme }) => theme.sizes.rowHeight}px);
  grid-gap: 1rem;
  justify-content: start;
  align-content: start;
  justify-items: start;
  align-items: start;
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

const StyledPagination = styled.div`
  grid-column: 1 / -1;
  height: 50px;
  width: 100%;
  display: flex;
  justify-content: flex-start;
  align-items: stretch;
`;

const StyledPageButton = styled.button`
  flex: 0 1 50px;
  color: ${({ theme }) => theme.colors.appColor};
  background-color: ${({ theme, selected }) =>
    selected ? theme.bg.selectedBg : theme.bg.secondaryBg};
  padding: 10px;
  border: none;
  cursor: pointer;
  & + & {
    margin-left: 5px;
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.bg.selectedBg};
  }
`;

const StyledClearfix = styled.div`
  grid-column: 1 / -1;
  align-self: end;
  height: 60px;
  width: 100%;
  background-color: ${({ theme }) => theme.bg.secondaryBg};
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  & > i {
    font-size: 2rem;
  }
`;

const NewTabContent = () => {
  const activeTab = useSelector((state) => state.activeTab);
  const drives = useSelector((state) => state.drives);
  const favorites = useSelector((state) => state.favorites);

  const themeContext = useContext(ThemeContext);

  const pageSize = themeContext.sizes.favPageSize || 10;
  const [favPage, setFavPage] = useState([0, pageSize]);
  const [pageNum, setPageNum] = useState(0);

  const contentRef = useRef(null);

  const handleOpenDirectory = (newPath) => {
    ipcRenderer.send('open-directory', activeTab, newPath, false);
  };

  const handleScrollTop = () => {
    contentRef.current.scrollTop = 0;
  };

  const handleSetFavPage = (num) => {
    const skippedCount = num * pageSize;
    setPageNum(num);
    setFavPage([skippedCount, skippedCount + pageSize]);
  };

  const renderHardDrives = () => {
    return drives
      .sort((a, b) => (a.filesystem < b.filesystem ? -1 : 1))
      .map((item, i) => (
        <HardDrive
          key={item.filesystem}
          {...item}
          handleOpenDirectory={() => handleOpenDirectory(item.mounted)}
        />
      ));
  };

  const renderFavorites = () => {
    // Show folders first
    const sortedFav = favorites.sort((a, b) =>
      a.isFile && !b.isFile ? 1 : -1
    );

    const pageFav = sortedFav.slice(favPage[0], favPage[1]);

    return pageFav.map((item) => <FavoriteItem key={item.id} {...item} />);
  };

  const renderPagination = () => {
    const countOfPages = Math.ceil(favorites.length / pageSize);

    return Array(countOfPages)
      .fill('')
      .map((item, idx) => (
        <StyledPageButton
          selected={pageNum === idx}
          key={idx}
          onClick={() => handleSetFavPage(idx)}
        >
          {idx + 1}
        </StyledPageButton>
      ));
  };

  useEffect(() => {
    ipcRenderer.send('get-drives');
  }, []);

  // TODO: Add function to remove from favorites
  // Add function to set icon to fav dir

  return (
    <StyledContent ref={contentRef}>
      <Heading>Your Hard Drives</Heading>

      {drives.length > 0 ? (
        renderHardDrives()
      ) : (
        <h2>You have not added hard drives yet...</h2>
      )}
      <Heading>Favorites</Heading>

      {favorites.length > pageSize ? (
        <StyledPagination>{renderPagination()}</StyledPagination>
      ) : null}

      {favorites.length > 0 ? (
        renderFavorites()
      ) : (
        <h2>You have not added favorites yet...</h2>
      )}

      {favorites.length > pageSize ? (
        <StyledPagination>{renderPagination()}</StyledPagination>
      ) : null}

      <StyledClearfix onClick={handleScrollTop}>
        <Icon iconName="ChevronUpMed" ariaLabel="go up" />
      </StyledClearfix>
    </StyledContent>
  );
};

export default NewTabContent;
