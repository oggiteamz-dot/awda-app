/**
 * app.js — THE USER DOOR.
 *
 * The person's screens and nothing else: no staff route, no edit tool, no
 * screen that would admit such things exist. The scholars' desk and the admin
 * console run these same screens from core/shell.js with their tools laid on
 * top; the build copies only what each door imports, and scripts/gates.mjs
 * fails the build if a staff file or word ever lands in this folder.
 */
import { startApp } from './core/shell.js';

startApp();
