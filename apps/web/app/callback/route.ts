import { handleAuth } from '@workos-inc/authkit-nextjs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const handler = handleAuth();

export async function GET(request: NextRequest) {
	const response = await handler(request);

	// If AuthKit didn't redirect somewhere else, ensure the callback URL
	// doesn't remain visible to the user.
	const location = response?.headers?.get('location');
	if (!location) {
		const url = new URL(request.url);
		return NextResponse.redirect(new URL('/', url.origin));
	}

	return response;
}
