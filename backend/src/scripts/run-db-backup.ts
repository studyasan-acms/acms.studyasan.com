import 'dotenv/config';
import { DatabaseBackupService } from '../services/databaseBackup.service.js';

async function main() {
  console.log('🚀 Triggering manual database backup to S3...');
  const result = await DatabaseBackupService.runBackupNow();
  console.log('📊 Backup Result:');
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ Fatal error triggering DB backup:', err);
  process.exit(1);
});
