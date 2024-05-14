'use server';

import { FormState, endpoint, userFormSchema } from '@lib/definitions';
import { z } from 'zod';
import { getJwtPayload, getSessionCookie, validateWithSchema } from './utils';

export type UserData = z.infer<typeof userFormSchema>;

export async function updateUser(data: UserData): Promise<FormState> {
  try {
    const validatedData = validateWithSchema(userFormSchema, data);
    const { displayName } = validatedData;

    const sessionCookie = getSessionCookie();

    if (!sessionCookie) {
      return {
        status: 'failed',
        message: 'No session cookie found',
      };
    }

    const payload = await getJwtPayload();

    if (typeof payload?.id !== 'string') {
      throw new Error('No payload id');
    }

    const userId = payload.id;

    const response = await fetch(`${endpoint}/user/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionCookie}`,
      },
      body: JSON.stringify(validatedData),
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      return {
        status: 'failed',
        message: `${errorMessage ?? 'Update user failed'} (${response.status})`,
      };
    }

    return {
      status: 'success',
      message: `User ${displayName} is updated successfully.`,
    };
  } catch (error) {
    return {
      status: 'failed',
      message: `Failed to update user due to error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export type UserFetchState =
  | {
      status: 'success';
      data: UserData;
    }
  | {
      status: 'failed';
      message: string;
    };

export async function fetchMe(): Promise<UserFetchState> {
  try {
    const sessionCookie = getSessionCookie();

    if (!sessionCookie) {
      return {
        status: 'failed',
        message: 'No session cookie found',
      };
    }

    const payload = await getJwtPayload();
    if (typeof payload?.id !== 'string') {
      throw new Error('No payload id');
    }
    const userId = payload.id;

    const response = await fetch(`${endpoint}/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionCookie}`,
      },
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      return {
        status: 'failed',
        message: `${errorMessage ?? 'Fetch user data failed'} (${response.status})`,
      };
    }

    const fetchedData = await response.json();

    const validatedData = userFormSchema.safeParse(fetchedData);

    if (!validatedData.success) {
      return {
        status: 'failed',
        message: 'Data validation failed',
      };
    }

    return {
      status: 'success',
      data: validatedData.data,
    };
  } catch (error) {
    return {
      status: 'failed',
      message: `Error fetching user data: ${error}`,
    };
  }
}
