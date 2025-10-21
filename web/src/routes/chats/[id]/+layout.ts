import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ params }: { params: { id: string } }) => {
    return {
        id: params.id
    }
}