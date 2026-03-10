#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import prompts from 'prompts';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_DIR = path.join(__dirname, 'template');

async function main() {
  console.log(chalk.bold.cyan('\n🤖 Create Agentic App\n'));

  program
    .name('create-agentic-app')
    .description('Scaffold a new agentic AI application')
    .argument('[project-directory]', 'Project directory name (use "." for current directory)')
    .option('-y, --yes', 'Auto-confirm non-empty directory prompt')
    .option('-p, --package-manager <manager>', 'Package manager to use: pnpm | npm | yarn')
    .option('--skip-install', 'Skip dependency installation')
    .option('--skip-git', 'Skip git repository initialization')
    .parse(process.argv);

  const args = program.args;
  const opts = program.opts();
  let projectDir = args[0] || '.';

  // Validate --package-manager value if provided
  const validPackageManagers = ['pnpm', 'npm', 'yarn'];
  if (opts.packageManager && !validPackageManagers.includes(opts.packageManager)) {
    console.log(chalk.red(`Invalid package manager: "${opts.packageManager}"`));
    console.log(chalk.yellow(`Valid options: ${validPackageManagers.join(', ')}`));
    process.exit(1);
  }

  // Resolve the target directory
  const targetDir = path.resolve(process.cwd(), projectDir);
  const projectName = projectDir === '.' ? path.basename(targetDir) : projectDir;

  // Check if directory exists and is not empty
  if (fs.existsSync(targetDir)) {
    const files = fs.readdirSync(targetDir);
    if (files.length > 0 && projectDir !== '.') {
      if (opts.yes) {
        console.log(chalk.yellow(`Directory "${projectDir}" is not empty. Proceeding (--yes).`));
      } else {
        const { proceed } = await prompts({
          type: 'confirm',
          name: 'proceed',
          message: `Directory "${projectDir}" is not empty. Continue anyway?`,
          initial: false
        });

        if (!proceed) {
          console.log(chalk.yellow('Cancelled.'));
          process.exit(0);
        }
      }
    }
  }

  // Determine package manager
  let packageManager;
  if (opts.packageManager) {
    packageManager = opts.packageManager;
  } else {
    const response = await prompts({
      type: 'select',
      name: 'packageManager',
      message: 'Which package manager do you want to use?',
      choices: [
        { title: 'pnpm (recommended)', value: 'pnpm' },
        { title: 'npm', value: 'npm' },
        { title: 'yarn', value: 'yarn' }
      ],
      initial: 0
    });
    packageManager = response.packageManager;

    if (!packageManager) {
      console.log(chalk.yellow('Cancelled.'));
      process.exit(0);
    }
  }

  console.log();
  const spinner = ora('Creating project...').start();

  try {
    // Create target directory if it doesn't exist
    fs.ensureDirSync(targetDir);

    // Copy template files
    spinner.text = 'Copying template files...';
    await fs.copy(TEMPLATE_DIR, targetDir, {
      overwrite: false,
      errorOnExist: false,
      filter: (src) => {
        // Skip node_modules, .next, and other build artifacts
        const relativePath = path.relative(TEMPLATE_DIR, src);
        return !relativePath.includes('node_modules') &&
               !relativePath.includes('.next') &&
               !relativePath.includes('.git') &&
               !relativePath.includes('pnpm-lock.yaml') &&
               !relativePath.includes('package-lock.json') &&
               !relativePath.includes('yarn.lock') &&
               !relativePath.includes('tsconfig.tsbuildinfo');
      }
    });

    // Copy .env.example to .env if it doesn't exist
    const envExamplePath = path.join(targetDir, 'env.example');
    const envPath = path.join(targetDir, '.env');

    if (fs.existsSync(envExamplePath) && !fs.existsSync(envPath)) {
      spinner.text = 'Setting up environment file...';
      await fs.copy(envExamplePath, envPath);
    }

    // Rename _gitignore to .gitignore (npm excludes .gitignore by default)
    const gitignoreTemplatePath = path.join(targetDir, '_gitignore');
    const gitignorePath = path.join(targetDir, '.gitignore');

    if (fs.existsSync(gitignoreTemplatePath)) {
      spinner.text = 'Setting up .gitignore file...';
      await fs.move(gitignoreTemplatePath, gitignorePath, { overwrite: true });
    }

    // Update package.json name if not current directory
    if (projectDir !== '.') {
      const packageJsonPath = path.join(targetDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        packageJson.name = projectName;
        await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      }
    }

    spinner.succeed(chalk.green('Project created successfully!'));

    // Install dependencies
    if (opts.skipInstall) {
      console.log(chalk.yellow('\nSkipping dependency installation (--skip-install).'));
    } else {
      console.log();
      const installSpinner = ora(`Installing dependencies with ${packageManager}...`).start();

      try {
        const installCmd = packageManager === 'yarn' ? 'yarn install' : `${packageManager} install`;
        execSync(installCmd, {
          cwd: targetDir,
          stdio: 'pipe'
        });
        installSpinner.succeed(chalk.green('Dependencies installed!'));
      } catch (error) {
        installSpinner.fail(chalk.red('Failed to install dependencies'));
        console.log(chalk.yellow(`\nPlease run "${packageManager} install" manually.\n`));
      }
    }

    // Initialize Git repository
    if (opts.skipGit) {
      console.log(chalk.yellow('\nSkipping git initialization (--skip-git).'));
    } else {
      console.log();
      const gitSpinner = ora('Initializing Git repository...').start();

      try {
        // Check if git is available
        execSync('git --version', { stdio: 'pipe' });

        // Initialize git repo if not already initialized
        if (!fs.existsSync(path.join(targetDir, '.git'))) {
          execSync('git init', { cwd: targetDir, stdio: 'pipe' });
          execSync('git add .', { cwd: targetDir, stdio: 'pipe' });
          execSync('git commit -m "Initial commit from create-agentic-app"', {
            cwd: targetDir,
            stdio: 'pipe'
          });
          gitSpinner.succeed(chalk.green('Git repository initialized!'));
        } else {
          gitSpinner.info(chalk.blue('Git repository already exists'));
        }
      } catch (error) {
        gitSpinner.warn(chalk.yellow('Git not found - skipping repository initialization'));
      }
    }

    // Display next steps
    console.log();
    console.log(chalk.bold.green('✨ Your agentic app is ready!\n'));
    console.log(chalk.bold('Next steps:\n'));

    if (projectDir !== '.') {
      console.log(chalk.cyan(`  cd ${projectDir}`));
    }

    console.log(chalk.cyan('  1. Update the .env file with your API keys and database credentials'));
    console.log(chalk.cyan(`  2. Start the database: docker compose up -d`));
    console.log(chalk.cyan(`  3. Run database migrations: ${packageManager} run db:migrate`));
    console.log(chalk.cyan(`  4. Start the development server: ${packageManager} run dev`));

    console.log();
    console.log(chalk.gray('For more information, check out the README.md file.\n'));

  } catch (error) {
    spinner.fail(chalk.red('Failed to create project'));
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);
