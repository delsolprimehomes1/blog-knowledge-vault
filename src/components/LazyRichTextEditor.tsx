import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const RichTextEditor = lazy(() => 
  import('@/components/RichTextEditor').then(module => ({ 
    default: module.RichTextEditor 
  }))
);

interface LazyRichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export const LazyRichTextEditor = (props: LazyRichTextEditorProps) => {
  return (
    <Suspense 
      fallback={
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <RichTextEditor {...props} />
    </Suspense>
  );
};
