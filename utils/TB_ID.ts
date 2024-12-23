import { supabase } from "../main.ts";

export const getTB_IDs = async (id: string) => {
  const res = (
    await supabase
      .from("accounts")
      .select("tigerbeetle_ids")
      .eq("user_id", id)
      .single()
  ).data?.tigerbeetle_ids;
  console.log(res);
};
