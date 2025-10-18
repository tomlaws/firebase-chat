export const load = ({ params }: { params: { id: string } }) => {
    console.log("Loading chat with ID:", params.id);
    return {
        id: params.id
    }
}