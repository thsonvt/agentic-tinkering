import React from 'react';
import Layout from '@theme/Layout';
import ProtectedContent from '@site/src/components/ProtectedContent';

export default function SampleDraft(): React.ReactNode {
  return (
    <Layout title="Sample Draft" description="A sample draft post">
      <ProtectedContent>
        <div style={{maxWidth: '800px', margin: '0 auto', padding: '2rem'}}>
          <h1>Sample Draft Post</h1>
          <p style={{color: 'var(--ifm-color-emphasis-600)', marginBottom: '2rem'}}>
            Draft - Last updated: January 13, 2025
          </p>

          <p>
            This is a sample draft post. Only you can see this content when you are
            logged in. Replace this with your actual work-in-progress content.
          </p>

          <h2>How to Add More Drafts</h2>
          <ol>
            <li>Create a new file in <code>src/pages/drafts/</code></li>
            <li>Wrap your content with the <code>ProtectedContent</code> component</li>
            <li>Add an entry to the drafts array in <code>src/pages/drafts/index.tsx</code></li>
          </ol>

          <h2>Work in Progress</h2>
          <p>
            Add your draft content here. When you are ready to publish, move the
            content to the <code>docs/</code> or <code>blog/</code> folder.
          </p>
        </div>
      </ProtectedContent>
    </Layout>
  );
}
