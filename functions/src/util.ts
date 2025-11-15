export async function truncatedSha256(userId: string, timestamp: number, length = 8) {
    // Combine userId and timestamp into a single string
    const input = `${userId}-${timestamp}`;

    // Encode the input string into bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(input);

    // Compute SHA-256 digest
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    // Convert buffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexString = hashArray
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

    // Return truncated hex (default: 8 chars)
    return hexString.slice(0, length);
}