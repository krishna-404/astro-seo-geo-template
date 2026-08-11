/**
 * The founder photograph, if one has been added.
 *
 * OPTIONAL BY DESIGN. import.meta.glob resolves at build time and returns an
 * empty object when nothing matches, so the site builds with or without
 * src/assets/founder.jpg. A plain `import` would hard-fail the build until the
 * file existed — which would mean the component using it could not be committed
 * before the photograph was.
 *
 * Shared rather than globbed twice, so the rendered avatar and the `image` on
 * the Person node in the JSON-LD can never disagree about whether a photo
 * exists. Add it with `node marketing/founder-photo.mjs <photo>`.
 */
const photos = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/founder.{jpg,jpeg,png,webp}',
  { eager: true }
);

export const FOUNDER_PHOTO: ImageMetadata | undefined = Object.values(photos)[0]?.default;
