import React, { FC } from 'react';
import useStore from '../../store/user/store';
import { Outlet } from 'react-router-dom';
import { MainNavigation } from '@buerokratt-ria/menu';
import { Header, useMenuCountConf } from '@buerokratt-ria/header';
import { useToast } from '../../hooks/useToast';
import './Layout.scss';

const Layout: FC = () => {
  const menuCountConf = useMenuCountConf();
  const domainBarShowing = import.meta.env.REACT_APP_ENABLE_MULTI_DOMAIN?.toLowerCase() === 'true';

  return (
    <div className={`layout${domainBarShowing ? ' layout--multi-domain' : ''}`}>
      <MainNavigation countConf={menuCountConf} />
      <div className="layout__wrapper">
        <Header
          toastContext={useToast()}
          user={useStore.getState().userInfo}
          setUserDomains={useStore((state) => state.setUserDomains)} 
          isDomainSelectorVisible={domainBarShowing}        
        />
        <main className="layout__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
