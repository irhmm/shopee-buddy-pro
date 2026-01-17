import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  totalItems,
  itemsPerPage,
  onPageChange 
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Calculate display range
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

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
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Info Section */}
      <div className="text-sm text-muted-foreground">
        Menampilkan {startItem} - {endItem} dari {totalItems} data
      </div>

      {/* Navigation Section */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="gap-1 h-9 px-3"
        >
          <ChevronLeft size={16} />
          Previous
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
              className={cn(
                "h-9 w-9 p-0",
                currentPage === page && "bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
              )}
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
          className="gap-1 h-9 px-3"
        >
          Next
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
