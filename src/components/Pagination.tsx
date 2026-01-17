import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = [];
  const showEllipsisStart = currentPage > 3;
  const showEllipsisEnd = currentPage < totalPages - 2;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pages.push(i);
    } else if (
      (i === 2 && showEllipsisStart) ||
      (i === totalPages - 1 && showEllipsisEnd)
    ) {
      pages.push(-i); // negative indicates ellipsis
    }
  }

  // Remove duplicate ellipsis
  const uniquePages = pages.filter((page, index, arr) => {
    if (page < 0 && arr[index - 1] < 0) return false;
    return true;
  });

  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-9 w-9 p-0"
      >
        <ChevronLeft size={16} />
      </Button>

      {uniquePages.map((page, index) => {
        if (page < 0) {
          return (
            <span key={index} className="px-2 text-muted-foreground">
              ...
            </span>
          );
        }
        return (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(page)}
            className="h-9 w-9 p-0"
          >
            {page}
          </Button>
        );
      })}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-9 w-9 p-0"
      >
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
