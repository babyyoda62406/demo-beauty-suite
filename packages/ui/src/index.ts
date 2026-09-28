/**
 * @fgd/ui — shared design system for FGD Beauty Suite.
 * Radix primitives + class-variance-authority, styled with the brand palette.
 */

export { cn } from './lib/cn';

export { Button, buttonVariants, type ButtonProps } from './components/button';
export { Input, type InputProps } from './components/input';
export { Textarea, type TextareaProps } from './components/textarea';
export { Label } from './components/label';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './components/card';
export { Badge, badgeVariants, type BadgeProps } from './components/badge';
export { Skeleton } from './components/skeleton';
export { Avatar, AvatarImage, AvatarFallback } from './components/avatar';

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/dialog';

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetContent,
  SheetHeader,
  SheetTitle,
  type SheetContentProps,
} from './components/sheet';

export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/tabs';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from './components/dropdown-menu';

export {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from './components/toast';
export { Toaster } from './components/toaster';
export { useToast, toast, type ToasterToast } from './components/use-toast';
export type { ToastProps, ToastActionElement } from './components/toast-types';
