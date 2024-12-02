export interface UserPreRegistration {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    confirm_password: string;
    country_id: number;
    industry_ids: number[];
    consulting_feild_ids: number[];
    hs_code?: string;
    description?: string;
    other_consulting_field?:string;
  }