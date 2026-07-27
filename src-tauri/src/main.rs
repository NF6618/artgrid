// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    artgrid_lib::run()
}

//            metadata::get_tags,
            metadata::add_tag_to_asset,
            metadata::remove_tag_from_asset,
            metadata::add_asset_to_collection,
            metadata::remove_asset_from_collection
        ]
