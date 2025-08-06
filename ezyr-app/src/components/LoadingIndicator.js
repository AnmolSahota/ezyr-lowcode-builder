import { Loader } from 'lucide-react';

/**
 * A full-screen overlay with a centered round spinner using lucide-react.
 */
export default function LoadingIndicator() {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-50 z-50">
            <Loader className="animate-spin" size={48} />
        </div>
    );
}
