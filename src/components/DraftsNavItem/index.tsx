import React from 'react';
import Link from '@docusaurus/Link';
import {useAuth} from '@site/src/contexts/AuthContext';

export default function DraftsNavItem(): React.ReactNode {
  const {user, isLoading} = useAuth();

  if (isLoading || !user) {
    return null;
  }

  return (
    <Link to="/drafts" className="navbar__item navbar__link">
      Drafts
    </Link>
  );
}
