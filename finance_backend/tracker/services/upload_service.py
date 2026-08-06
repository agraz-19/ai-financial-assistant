"""
Unified upload processing service.

This service handles the complete statement upload workflow:
- Detects CSV/PDF
- Parses file
- Saves transactions
- Runs AI categorization
- Generates embeddings
- Refreshes dashboard insights
- Updates statement status

Used by both the old Django template upload and the new React DRF endpoint.
No code duplication.
"""
import hashlib
from io import BytesIO
from django.utils import timezone
from django.db import transaction

from ..models import Statement
from ..parsers.csv_parser import CSVParseError, parse_csv_statement, save_transactions
from ..parsers.pdf_parser import PDFParseError, parse_pdf_statement
from ..ai.categorize import run_categorization_for_statement
from ..ai.embeddings import embed_transactions_for_statement
from .insights import refresh_after_new_data


def process_uploaded_statement(statement, uploaded_file):
    """
    Process a complete statement upload workflow.
    
    Args:
        statement: Statement model instance (must exist in DB)
        uploaded_file: Django UploadedFile object
    
    Returns:
        dict: {
            'status': 'COMPLETED' or 'FAILED',
            'transaction_count': int,
            'error_message': str or None,
        }
    
    Raises:
        Exception: Re-raises any exception after marking statement as FAILED
    """
    try:
        # Read file bytes for parsing
        file_bytes = uploaded_file.read()
        uploaded_file.seek(0)
        
        # Detect file type
        file_type = (
            Statement.FileType.CSV
            if uploaded_file.name.lower().endswith(".csv")
            else Statement.FileType.PDF
        )
        
        # Parse file
        try:
            if file_type == Statement.FileType.CSV:
                parsed, warnings = parse_csv_statement(BytesIO(file_bytes))
            else:
                parsed, warnings = parse_pdf_statement(BytesIO(file_bytes))
        except CSVParseError as e:
            raise Exception(f"CSV parsing failed: {e}")
        except PDFParseError as e:
            raise Exception(f"PDF parsing failed: {e}")
        
        # Update statement metadata
        statement.file = uploaded_file
        statement.file_type = file_type
        statement.status = Statement.Status.PROCESSING
        statement.error_message = None
        statement.save()
        
        # Save transactions in atomic transaction
        with transaction.atomic():
            # Delete existing transactions if re-uploading
            statement.transactions.all().delete()
            
            # Parse and save transactions
            transaction_count = save_transactions(statement, parsed)
            
            # Mark as completed
            statement.status = Statement.Status.COMPLETED
            statement.processed_at = timezone.now()
            statement.save(update_fields=["status", "processed_at"])
        
        # Run AI categorization (non-blocking, errors logged but don't fail upload)
        try:
            categorized_count = run_categorization_for_statement(statement)
        except Exception as e:
            print(f"[process_uploaded_statement] Categorization warning: {e}")
        
        # Generate embeddings (non-blocking, errors logged but don't fail upload)
        try:
            embedded_count = embed_transactions_for_statement(statement)
        except Exception as e:
            print(f"[process_uploaded_statement] Embedding warning: {e}")
        
        # Refresh dashboard insights (non-blocking, errors logged but don't fail upload)
        try:
            refresh_after_new_data(statement.user, statement)
        except Exception as e:
            print(f"[process_uploaded_statement] Dashboard refresh warning: {e}")
        
        return {
            'status': 'COMPLETED',
            'transaction_count': transaction_count,
            'error_message': None,
        }
    
    except Exception as e:
        # Mark statement as failed
        statement.status = Statement.Status.FAILED
        statement.error_message = str(e)
        statement.save(update_fields=["status", "error_message"])
        
        # Re-raise exception so caller can handle it
        raise
