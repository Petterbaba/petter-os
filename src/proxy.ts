import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Kjører før hver request (Next 16: proxy, tidligere middleware):
// fornyer Supabase-sesjonen og sender uinnloggede til /logg-inn.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesTilSetting) {
          cookiesTilSetting.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesTilSetting.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() validerer tokenet mot Supabase – aldri getSession() her.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !request.nextUrl.pathname.startsWith("/logg-inn")) {
    const url = request.nextUrl.clone();
    url.pathname = "/logg-inn";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Alt unntatt statiske filer og bilder – auth-logikk skal ikke blokkere assets.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
