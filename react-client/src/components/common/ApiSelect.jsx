export default function ApiSelect({ value, onChange }) {
  return (
    <label>
      Select API:
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="get_list_fb_user_photos">get_list_fb_user_photos</option>
        <option value="get_list_fb_user_reels">get_list_fb_user_reels</option>
        <option value="get_list_fb_highlights">get_list_fb_highlights</option>
        <option value="get_list_ig_post">get_list_ig_post</option>
        <option value="get_list_ig_user_stories">get_list_ig_user_stories</option>
      </select>
    </label>
  )
}