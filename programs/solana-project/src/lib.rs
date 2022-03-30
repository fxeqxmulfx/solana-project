extern crate core;

use instructions::*;
use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

declare_id!("D1wdCFggRdEXEYHTgVYBxVF8DQDJe3xRbe9QhQiYEnx2");

#[program]
pub mod solana_project {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize(ctx)
    }

    pub fn make_donations(ctx: Context<Donate>, lamports: u64) -> Result<()> {
        instructions::make_donations(ctx, lamports)
    }

    pub fn withdraw_donations(ctx: Context<Withdraw>, lamports: u64) -> Result<()> {
        instructions::withdraw_donations(ctx, lamports)
    }
}
